import copy
import io
import os
import shutil
import unittest
from pathlib import Path
from uuid import uuid4

# Avoid creating runtime data while importing the application factory in tests.
TEST_ROOT = Path(__file__).resolve().parents[2] / 'data' / 'tests'
os.environ.setdefault('PORTAL_DATA_DIR', str(TEST_ROOT / 'bootstrap'))
from fastapi.testclient import TestClient
from pypdf import PdfWriter
from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from app.db import PdfAttachment
from app.main import PREFIX, create_app
from app.legacy import from_table9
from app.main import app as bootstrap_app
bootstrap_app.state.engine.dispose()


def fixture():
    return {'schema_version': '1.0', 'event_id': 'test-event-1', 'source_system': 'test', 'external_id': 'synthetic-1', 'revision': 1, 'standard_version': '6.6', 'status': 'Review', 'invoice': {'invoice_num': 'SYNTHETIC-001', 'supplier_name': 'Example', 'company': 'TEST', 'grand_total': '107.00'}, 'rules': [], 'lines': []}


def pdf_bytes(pages=2):
    writer = PdfWriter()
    for _ in range(pages):
        writer.add_blank_page(width=595, height=842)
    content = io.BytesIO(); writer.write(content)
    return content.getvalue()


class PortalTests(unittest.TestCase):
    def setUp(self):
        self.directory = TEST_ROOT / str(uuid4())
        self.directory.mkdir(parents=True)
        self.app = create_app(self.directory, portal_key='', ingest_key='')
        self.client = TestClient(self.app)

    def tearDown(self):
        self.client.close(); self.app.state.engine.dispose()
        assert self.directory.resolve().is_relative_to(TEST_ROOT.resolve())
        shutil.rmtree(self.directory)

    def receive(self, payload=None):
        response = self.client.post(PREFIX + '/ingest', json=payload or fixture())
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()

    def test_ingest_survives_new_app_instance_and_search(self):
        doc = self.receive()
        second = create_app(self.directory, portal_key='', ingest_key='')
        with TestClient(second) as client:
            response = client.get(PREFIX + '/documents?q=synthetic&company=TEST').json()
            self.assertEqual(response['total'], 1)
            self.assertEqual(response['items'][0]['id'], doc['id'])
            self.assertEqual(response['items'][0]['invoice']['grand_total'], '107.00')
        second.state.engine.dispose()

    def test_idempotent_retry_and_conflicting_event(self):
        first, second = self.receive(), self.receive()
        self.assertEqual(first['id'], second['id']); self.assertTrue(second['duplicate'])
        changed = fixture(); changed['invoice']['grand_total'] = '999'
        self.assertEqual(self.client.post(PREFIX + '/ingest', json=changed).status_code, 409)
        self.assertEqual(self.client.get(PREFIX + '/documents').json()['total'], 1)

    def test_revision_history_and_stale_protection(self):
        original = fixture(); doc = self.receive(original)
        changed = copy.deepcopy(original); changed.update(revision=2, event_id='event-2', status='Hold')
        self.receive(changed)
        stale = copy.deepcopy(original); stale['event_id'] = 'late-event'
        self.assertEqual(self.client.post(PREFIX + '/ingest', json=stale).status_code, 409)
        detail = self.client.get(PREFIX + '/documents/' + doc['id']).json()
        self.assertEqual(detail['status'], 'Hold')
        self.assertEqual(detail['current_revision'], 2)
        self.assertTrue(detail['is_current'])
        self.assertEqual([item['revision'] for item in detail['revisions']], [2, 1])
        historical = self.client.get(PREFIX + f"/documents/{doc['id']}?revision=1").json()
        self.assertEqual(historical['status'], 'Review')
        self.assertFalse(historical['is_current'])
        self.assertEqual(self.client.get(PREFIX + f"/documents/{doc['id']}/revisions/1").json()['status'], 'Review')
        self.assertEqual(len(self.client.get(PREFIX + f"/documents/{doc['id']}/revisions").json()), 2)
        self.assertEqual(len(self.client.get(PREFIX + f"/documents/{doc['id']}/history").json()), 2)

    def test_schema_validation_and_redacted_errors(self):
        invalid = fixture(); invalid['status'] = 'made-up'
        response = self.client.post(PREFIX + '/ingest', json=invalid)
        self.assertEqual(response.status_code, 422)
        self.assertNotIn('supplier_name', response.text)
        invalid = fixture(); invalid['invoice']['grand_total'] = 'NaN'
        self.assertEqual(self.client.post(PREFIX + '/ingest', json=invalid).status_code, 422)
        invalid = fixture(); invalid['unexpected'] = 'value'
        self.assertEqual(self.client.post(PREFIX + '/ingest', json=invalid).status_code, 422)

    def test_pdf_upload_view_missing_and_revision_warning(self):
        doc_id = self.receive()['id']; path = PREFIX + f'/documents/{doc_id}/pdf'
        self.assertEqual(self.client.get(path).status_code, 404)
        self.assertEqual(self.client.post(path + '?revision=1', files={'file': ('invoice.pdf', b'not a PDF')}).status_code, 422)
        raw = pdf_bytes()
        response = self.client.post(path + '?revision=1', files={'file': ('../../bad.pdf', raw, 'application/pdf')})
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['pages'], 2)
        self.assertEqual(self.client.get(path).content, raw)
        changed = fixture(); changed.update(revision=2, event_id='event-2'); self.receive(changed)
        self.assertTrue(self.client.get(PREFIX + f'/documents/{doc_id}').json()['pdf']['stale'])
        self.assertEqual(self.client.post(path + '?revision=99', files={'file': ('invoice.pdf', raw)}).status_code, 404)

    def test_pdf_is_archived_and_served_per_revision(self):
        doc_id = self.receive()['id']; path = PREFIX + f'/documents/{doc_id}/pdf'
        first_pdf, second_pdf = pdf_bytes(1), pdf_bytes(3)
        self.assertEqual(self.client.post(path + '?revision=1', files={'file': ('r1.pdf', first_pdf)}).status_code, 200)
        changed = fixture(); changed.update(revision=2, event_id='event-2', status='Hold'); self.receive(changed)
        self.assertEqual(self.client.post(path + '?revision=2', files={'file': ('r2.pdf', second_pdf)}).status_code, 200)
        self.assertEqual(self.client.get(path + '?revision=1').content, first_pdf)
        self.assertEqual(self.client.get(path + '?revision=2').content, second_pdf)
        current = self.client.get(PREFIX + f'/documents/{doc_id}').json()
        self.assertEqual(current['pdf'], {'available': True, 'pages': 3, 'revision': 2, 'stale': False})
        historical = self.client.get(PREFIX + f'/documents/{doc_id}?revision=1').json()
        self.assertEqual(historical['pdf'], {'available': True, 'pages': 1, 'revision': 1, 'stale': False})
        self.assertEqual([item['pdf']['pages'] for item in current['revisions']], [3, 1])

    def test_legacy_pdf_metadata_is_backfilled_into_revision_archive(self):
        doc_id = self.receive()['id']; path = PREFIX + f'/documents/{doc_id}/pdf'
        self.assertEqual(self.client.post(path + '?revision=1', files={'file': ('legacy.pdf', pdf_bytes(1))}).status_code, 200)
        with Session(self.app.state.engine) as session:
            session.execute(delete(PdfAttachment).where(PdfAttachment.document_id == doc_id))
            session.commit()
            self.assertIsNone(session.scalar(select(PdfAttachment).where(PdfAttachment.document_id == doc_id)))

        migrated = create_app(self.directory, portal_key='', ingest_key='')
        with TestClient(migrated) as client:
            detail = client.get(PREFIX + f'/documents/{doc_id}').json()
            self.assertEqual(detail['pdf'], {'available': True, 'pages': 1, 'revision': 1, 'stale': False})
            self.assertTrue(detail['revisions'][0]['pdf']['available'])
        migrated.state.engine.dispose()

    def test_cross_origin_mutation_rejected(self):
        response = self.client.post(PREFIX + '/imports', json=fixture(), headers={'Origin': 'https://untrusted.example'})
        self.assertEqual(response.status_code, 403)

    def test_key_separation_and_protected_content(self):
        secured = create_app(self.directory, portal_key='test-read-key', ingest_key='test-write-key')
        with TestClient(secured) as client:
            read = {'Authorization': 'Bearer test-read-key'}
            write = {'Authorization': 'Bearer test-write-key'}
            self.assertEqual(client.get(PREFIX + '/documents').status_code, 401)
            self.assertEqual(client.post(PREFIX + '/ingest', json=fixture(), headers=read).status_code, 401)
            doc_id = client.post(PREFIX + '/ingest', json=fixture(), headers=write).json()['id']
            self.assertEqual(client.get(PREFIX + f'/documents/{doc_id}', headers=write).status_code, 401)
            self.assertEqual(client.get(PREFIX + f'/documents/{doc_id}/pdf').status_code, 401)
            self.assertEqual(client.get(PREFIX + '/documents', headers=read).status_code, 200)
        secured.state.engine.dispose()

    def test_filters_counts_and_pagination(self):
        self.receive()
        other = fixture(); other.update(external_id='synthetic-2', event_id='event-other', status='Hold'); other['invoice']['company'] = 'OTHER'
        self.receive(other)
        response = self.client.get(PREFIX + '/documents?company=TEST&status=Hold').json()
        self.assertEqual(response['total'], 0); self.assertEqual(response['counts'], {'Review': 1})
        self.assertEqual(len(self.client.get(PREFIX + '/documents?page_size=1').json()['items']), 1)
        self.assertEqual(self.client.get(PREFIX + '/documents?q=%25').json()['total'], 0)

    def test_workspace_audit_can_be_searched_filtered_and_paginated(self):
        doc_id = self.receive()['id']
        path = PREFIX + f'/documents/{doc_id}/pdf'
        self.client.post(path + '?revision=1', files={'file': ('invoice.pdf', pdf_bytes(1))})
        self.client.get(path + '?revision=1')
        audit = self.client.get(PREFIX + '/audit-events?q=synthetic&page_size=2').json()
        self.assertEqual(audit['total'], 3)
        self.assertEqual(len(audit['items']), 2)
        self.assertEqual(audit['items'][0]['invoice_num'], 'SYNTHETIC-001')
        self.assertEqual(set(audit['kinds']), {'received', 'pdf_attached', 'pdf_viewed'})
        received = self.client.get(PREFIX + '/audit-events?kind=received').json()
        self.assertEqual(received['total'], 1)
        session = self.client.get(PREFIX + '/session').json()
        self.assertTrue(session['capabilities']['view_audit'])
        self.assertTrue(session['capabilities']['workflow_actions'])
        self.assertTrue(session['capabilities']['action_outbox'])

    def test_resubmit_is_persistent_idempotent_and_completed_by_new_revision(self):
        payload = fixture()
        payload['receipt'] = {'receipt_num': 'R-SYNTHETIC', 'receiver': 'EXAMPLE RECEIVER'}
        payload['rules'] = [{'rule_id': 'V-06', 'result': 'fail', 'exception_code': 'E08', 'severity': 'Medium'}]
        doc_id = self.receive(payload)['id']
        detail = self.client.get(PREFIX + f'/documents/{doc_id}').json()
        self.assertEqual(detail['workflow']['assigned_to'], 'End user')
        resubmit = {
            'request_id': 'action-resubmit-1', 'action': 'resubmit', 'reason_code': 'signature_added',
            'note': 'Synthetic correction', 'new_receipt_num': 'R-SYNTHETIC-2',
            'expected_revision': 1, 'expected_workflow_version': 0,
        }
        response = self.client.post(PREFIX + f'/documents/{doc_id}/actions', json=resubmit)
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()['workflow']['status'], 'awaiting_revision')
        self.assertEqual(response.json()['request']['status'], 'pending')
        duplicate = self.client.post(PREFIX + f'/documents/{doc_id}/actions', json=resubmit).json()
        self.assertTrue(duplicate['duplicate'])
        conflict = copy.deepcopy(resubmit); conflict['reason_code'] = 'rescanned_all_pages'
        self.assertEqual(self.client.post(PREFIX + f'/documents/{doc_id}/actions', json=conflict).status_code, 409)
        outbox = self.client.get(PREFIX + '/action-requests').json()
        self.assertEqual(outbox['total'], 1)
        self.assertEqual(outbox['items'][0]['external_id'], 'synthetic-1')
        action_id = outbox['items'][0]['id']
        self.assertEqual(self.client.post(PREFIX + f'/action-requests/{action_id}/ack', json={'result': 'accepted'}).status_code, 200)

        revised = copy.deepcopy(payload)
        revised.update(revision=2, event_id='test-event-2', status='Auto-pass', rules=[])
        self.receive(revised)
        current = self.client.get(PREFIX + f'/documents/{doc_id}').json()
        self.assertEqual(current['workflow']['status'], 'under_review')
        self.assertEqual(current['workflow']['requests'][0]['status'], 'completed')
        self.assertIn('workflow_action', [item['kind'] for item in self.client.get(PREFIX + f'/documents/{doc_id}/history').json()])

    def test_review_actions_validate_reason_note_state_and_version(self):
        payload = fixture()
        payload['receipt'] = {'receipt_num': 'R-SYNTHETIC', 'receiver': 'EXAMPLE RECEIVER'}
        payload['rules'] = [{'rule_id': 'V-07', 'result': 'fail', 'exception_code': 'E09', 'severity': 'High'}]
        doc_id = self.receive(payload)['id']
        command = {
            'request_id': 'confirm-1', 'action': 'confirm', 'reason_code': 'variance_accepted',
            'expected_revision': 1, 'expected_workflow_version': 0,
        }
        self.assertEqual(self.client.post(PREFIX + f'/documents/{doc_id}/actions', json=command).status_code, 422)
        command['note'] = 'Approved for synthetic test'
        confirmed = self.client.post(PREFIX + f'/documents/{doc_id}/actions', json=command)
        self.assertEqual(confirmed.status_code, 200, confirmed.text)
        self.assertEqual(confirmed.json()['workflow']['status'], 'confirmed')
        stale = {**command, 'request_id': 'confirm-2'}
        self.assertEqual(self.client.post(PREFIX + f'/documents/{doc_id}/actions', json=stale).status_code, 409)
        invalid = {**command, 'request_id': 'hold-invalid', 'action': 'hold', 'reason_code': 'not-allowed', 'expected_workflow_version': 1}
        self.assertEqual(self.client.post(PREFIX + f'/documents/{doc_id}/actions', json=invalid).status_code, 422)

    def test_legacy_adapter_preserves_codes_and_missing_evidence(self):
        old = {'standard_version': '6.2', 'validation_round': 3, 'decision': {'status': 'Hold'},
               'invoice_summary': {'invoice_num': 'SYNTHETIC', 'supplier_name': 'Example', 'sub_total': 100, 'vat': 7, 'grand_total': 107},
               'rules': [{'rule_id': 'V-07', 'result': 'FAIL', 'code': 'E05'}],
               'exceptions': [{'rule_id': 'V-07', 'code': 'E05', 'severity': 'High', 'message': 'Price mismatch'}]}
        converted = from_table9({'data': old}, source_system='OCR', external_id='example', event_id='example-3', company='DEMO')
        self.assertEqual(converted.standard_version, '6.2')
        self.assertEqual(converted.rules[0].exception_code, 'E05')
        self.assertIsNone(converted.receipt); self.assertEqual(converted.lines, [])
        self.receive(converted.model_dump(mode='json'))
        with self.assertRaises(ValueError):
            from_table9({'invoice': {}}, source_system='OCR', external_id='example', event_id='example', company='DEMO')

    def test_project_structure_keeps_entrypoints_and_boundaries_small(self):
        project = Path(__file__).resolve().parents[2]
        backend = project / 'backend' / 'app'
        frontend = project / 'frontend' / 'src'
        for path in (
            backend / 'api' / 'routes', backend / 'auth', backend / 'domain' / 'documents',
            backend / 'db', backend / 'integrations', backend / 'storage', backend / 'workers',
            frontend / 'app', frontend / 'api', frontend / 'components', frontend / 'features' / 'queue',
            frontend / 'features' / 'documents', frontend / 'features' / 'viewer', frontend / 'styles', frontend / 'test',
        ):
            self.assertTrue(path.exists(), str(path))
        self.assertLess(len((backend / 'main.py').read_text(encoding='utf-8').splitlines()), 80)
        self.assertFalse((frontend / 'App.tsx').exists())
        self.assertFalse((backend / 'db.py').exists())


if __name__ == '__main__':
    unittest.main()
