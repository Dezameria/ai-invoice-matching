import hashlib
import json
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ...core.time import utc_now
from ...db.models import ActionRequest, Activity, Document, DocumentWorkflow
from .schemas import ActionAcknowledge, ActionCreate


ACTION_CONFIG = {
    'explain': {
        'label': 'ชี้แจง', 'description': 'ส่งเหตุผลให้ฝ่ายบัญชีตรวจต่อ',
        'reasons': {'source_read_error': 'เอกสารถูกต้อง ระบบอ่านผิด', 'credit_note_pending': 'ผู้ขายจะส่งใบลดหนี้'},
    },
    'resubmit': {
        'label': 'แก้ไขแล้ว ส่งตรวจซ้ำ', 'description': 'แจ้งระบบต้นทางให้ตรวจเอกสาร revision ใหม่',
        'reasons': {'signature_added': 'ขอลายเซ็นผู้รับของแล้ว สแกนใหม่', 'receipt_recreated': 'ยกเลิกแล้วทำรับใหม่ใน Oracle', 'rescanned_all_pages': 'สแกนใหม่ครบทุกหน้า'},
        'accepts_receipt': True,
    },
    'rerun': {
        'label': 'สั่งตรวจซ้ำ', 'description': 'ขอให้ระบบต้นทางค้นใบรับและประมวลผลอีกครั้ง',
        'reasons': {'receipt_created': 'ผู้ใช้งานทำรับใน Oracle แล้ว', 'document_rescanned': 'ผู้ใช้งานสแกนใหม่แล้ว'},
        'accepts_receipt': True,
    },
    'return': {
        'label': 'ส่งกลับผู้ใช้งาน', 'description': 'ส่งงานให้ Receiver แก้ไขข้อมูลต้นทาง',
        'reasons': {'fix_oracle_receipt': 'ต้องแก้ใบรับใน Oracle', 'request_signature': 'ต้องขอลายเซ็นผู้รับของ'},
    },
    'reject': {
        'label': 'ปฏิเสธเอกสาร', 'description': 'ปิดเอกสารและบันทึกเหตุผลที่ตรวจสอบได้',
        'reasons': {'duplicate_invoice': 'เอกสารซ้ำ', 'invalid_invoice': 'ผู้ขายออกใบแจ้งหนี้ผิด'},
        'danger': True,
    },
    'hold': {
        'label': 'พักเอกสาร', 'description': 'หยุดการดำเนินงานไว้ชั่วคราว',
        'reasons': {'waiting_vendor': 'รอเอกสารจากผู้ขาย', 'checking_price': 'รอตรวจสอบราคา'},
    },
    'confirm': {
        'label': 'ยืนยันผลตรวจ', 'description': 'บันทึกว่าผู้ตรวจยอมรับผลใน revision ปัจจุบัน',
        'reasons': {'verified_correct': 'ตรวจแล้วถูกต้อง', 'variance_accepted': 'ผลต่างยอมรับได้'},
        'primary': True,
    },
}

EU_CODES_66 = {'E01', 'E05', 'E06', 'E08', 'E10', 'E14', 'E15'}
TERMINAL = {'rejected', 'posted'}


class WorkflowService:
    def __init__(self, engine):
        self.engine = engine

    @staticmethod
    def _activity(session, document_id, kind, detail):
        session.add(Activity(id=str(uuid4()), document_id=document_id, kind=kind, detail=detail, created_at=utc_now()))

    @staticmethod
    def _default(payload):
        source_status = payload['status']
        if source_status == 'Posted':
            return 'posted', 'Closed'
        if source_status == 'Rejected':
            return 'rejected', 'Closed'
        if source_status == 'Confirmed':
            return 'confirmed', 'Accounting'
        codes = {rule.get('exception_code') for rule in payload.get('rules', []) if rule.get('result') == 'fail'}
        if payload.get('standard_version') == '6.6' and codes & EU_CODES_66:
            return 'needs_correction', 'End user'
        return 'under_review', 'Accounting'

    def summary(self, session, document, payload, include_requests=False):
        state = session.get(DocumentWorkflow, document.id)
        if state:
            result = {
                'status': state.status, 'assigned_to': state.assigned_to, 'version': state.version,
                'updated_at': state.updated_at, 'last_action_id': state.last_action_id,
            }
        else:
            status, assigned = self._default(payload)
            result = {'status': status, 'assigned_to': assigned, 'version': 0, 'updated_at': document.updated_at, 'last_action_id': None}
        if include_requests:
            requests = session.scalars(select(ActionRequest).where(ActionRequest.document_id == document.id).order_by(ActionRequest.created_at.desc()).limit(20)).all()
            result['requests'] = [self._request(item) for item in requests]
            result['available_actions'] = self.available_actions(document, payload, result)
        return result

    @staticmethod
    def _request(item):
        return {
            'id': item.id, 'request_id': item.request_id, 'action': item.action,
            'reason_code': item.reason_code, 'reason_label': item.reason_label, 'note': item.note,
            'new_receipt_num': item.new_receipt_num, 'expected_revision': item.expected_revision,
            'requested_by': item.requested_by, 'status': item.status, 'created_at': item.created_at,
            'acknowledged_at': item.acknowledged_at, 'acknowledgement_detail': item.acknowledgement_detail,
        }

    def available_actions(self, document, payload, workflow):
        receiver = (payload.get('receipt') or {}).get('receiver')
        high = any(rule.get('result') == 'fail' and rule.get('severity') == 'High' for rule in payload.get('rules', []))
        pending = next((item for item in workflow.get('requests', []) if item['status'] == 'pending'), None)
        output = []
        for action, config in ACTION_CONFIG.items():
            reason = None
            if workflow['status'] in TERMINAL:
                reason = 'เอกสารปิดแล้ว'
            elif pending:
                reason = 'มีคำขอที่รอระบบต้นทางดำเนินการอยู่'
            elif action in {'explain', 'resubmit'} and workflow['assigned_to'] != 'End user':
                reason = 'งานยังไม่ได้อยู่ที่ผู้ใช้งาน'
            elif action in {'return', 'reject', 'hold', 'confirm', 'rerun'} and workflow['assigned_to'] != 'Accounting':
                reason = 'งานยังไม่ได้อยู่ที่ฝ่ายบัญชี'
            elif action == 'return' and not receiver:
                reason = 'ยังไม่มี Receiver สำหรับส่งงานกลับ'
            elif action == 'rerun' and receiver:
                reason = 'ใช้ตรวจซ้ำกรณียังไม่มี Receiver'
            elif action == 'confirm' and (payload['status'] == 'Duplicate' or workflow['status'] == 'confirmed'):
                reason = 'เอกสารซ้ำหรือยืนยันแล้ว'
            elif action == 'hold' and workflow['status'] == 'on_hold':
                reason = 'เอกสารถูกพักอยู่แล้ว'
            output.append({
                'action': action, 'label': config['label'], 'description': config['description'],
                'allowed': reason is None, 'disabled_reason': reason,
                'reasons': [{'code': code, 'label': label} for code, label in config['reasons'].items()],
                'requires_note': action == 'confirm' and high,
                'accepts_receipt': config.get('accepts_receipt', False),
                'danger': config.get('danger', False), 'primary': config.get('primary', False),
            })
        return output

    def create_action(self, document_id, command: ActionCreate):
        normalized = command.model_dump(mode='json')
        fingerprint = hashlib.sha256(json.dumps(normalized, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        with Session(self.engine) as session:
            document = session.get(Document, document_id)
            if not document:
                raise HTTPException(404, 'Document not found.')
            existing = session.scalar(select(ActionRequest).where(ActionRequest.request_id == command.request_id))
            if existing:
                if existing.document_id != document_id or existing.fingerprint != fingerprint:
                    raise HTTPException(409, 'request_id was already used with different data.')
                return {'duplicate': True, 'request': self._request(existing), 'workflow': self.summary(session, document, document.payload, True)}
            if command.expected_revision != document.revision:
                raise HTTPException(409, 'Document revision changed; reload and try again.')
            workflow = self.summary(session, document, document.payload, True)
            if command.expected_workflow_version != workflow['version']:
                raise HTTPException(409, 'Workflow changed; reload and try again.')
            available = {item['action']: item for item in workflow['available_actions']}
            selected = available[command.action]
            if not selected['allowed']:
                raise HTTPException(409, selected['disabled_reason'])
            reasons = ACTION_CONFIG[command.action]['reasons']
            if command.reason_code not in reasons:
                raise HTTPException(422, 'Reason is not valid for this action.')
            note = command.note.strip() if command.note else None
            if selected['requires_note'] and not note:
                raise HTTPException(422, 'A note is required to confirm a High severity result.')
            stamp, action_id = utc_now(), str(uuid4())
            transitions = {
                'explain': ('under_review', 'Accounting'), 'resubmit': ('awaiting_revision', 'Source system'),
                'rerun': ('awaiting_revision', 'Source system'), 'return': ('needs_correction', 'End user'),
                'reject': ('rejected', 'Closed'), 'hold': ('on_hold', 'Accounting'),
                'confirm': ('confirmed', 'Accounting'),
            }
            next_status, assigned_to = transitions[command.action]
            request = ActionRequest(
                id=action_id, request_id=command.request_id, document_id=document.id, action=command.action,
                reason_code=command.reason_code, reason_label=reasons[command.reason_code], note=note,
                new_receipt_num=command.new_receipt_num or None, expected_revision=command.expected_revision,
                requested_by='shared-key-session', status='pending' if command.action in {'resubmit', 'rerun'} else 'recorded',
                fingerprint=fingerprint, created_at=stamp, acknowledged_at=None, acknowledgement_detail=None,
            )
            session.add(request)
            state = session.get(DocumentWorkflow, document.id)
            if state:
                changed = session.execute(update(DocumentWorkflow).where(
                    DocumentWorkflow.document_id == document.id, DocumentWorkflow.version == command.expected_workflow_version,
                ).values(version=command.expected_workflow_version + 1, status=next_status, assigned_to=assigned_to, last_action_id=action_id, updated_at=stamp))
                if changed.rowcount != 1:
                    raise HTTPException(409, 'Workflow changed; reload and try again.')
            else:
                session.add(DocumentWorkflow(document_id=document.id, version=1, status=next_status, assigned_to=assigned_to, last_action_id=action_id, updated_at=stamp))
            detail = f"{ACTION_CONFIG[command.action]['label']}: {reasons[command.reason_code]}"
            if note:
                detail += f' · {note}'
            self._activity(session, document.id, 'workflow_action', detail[:500])
            try:
                session.commit()
            except IntegrityError:
                session.rollback()
                raise HTTPException(409, 'Action changed concurrently; reload and try again.')
            return {'duplicate': False, 'request': self._request(request), 'workflow': self.summary(session, document, document.payload, True)}

    def list_requests(self, status='pending', source_system='', page=1, page_size=50):
        with Session(self.engine) as session:
            filters = []
            if status:
                filters.append(ActionRequest.status == status)
            if source_system:
                filters.append(Document.source_system == source_system)
            query = select(ActionRequest, Document).join(Document, Document.id == ActionRequest.document_id).where(*filters)
            total = session.scalar(select(func.count()).select_from(ActionRequest).join(Document, Document.id == ActionRequest.document_id).where(*filters))
            rows = session.execute(query.order_by(ActionRequest.created_at).offset((page - 1) * page_size).limit(page_size)).all()
            return {'items': [{**self._request(item), 'document_id': document.id, 'source_system': document.source_system, 'external_id': document.external_id} for item, document in rows], 'total': total, 'page': page, 'page_size': page_size}

    def acknowledge(self, action_id, acknowledgement: ActionAcknowledge):
        with Session(self.engine) as session:
            request = session.get(ActionRequest, action_id)
            if not request:
                raise HTTPException(404, 'Action request not found.')
            if request.status in {'accepted', 'failed', 'completed'}:
                if request.status != acknowledgement.result:
                    raise HTTPException(409, 'Action request was already acknowledged with a different result.')
                return self._request(request)
            if request.status != 'pending':
                raise HTTPException(409, 'This action does not require source acknowledgement.')
            stamp = utc_now()
            request.status = acknowledgement.result
            request.acknowledged_at = stamp
            request.acknowledgement_detail = acknowledgement.detail or None
            state = session.get(DocumentWorkflow, request.document_id)
            if acknowledgement.result == 'failed' and state and state.last_action_id == request.id:
                state.version += 1; state.status = 'action_failed'; state.assigned_to = 'Accounting'; state.updated_at = stamp
            self._activity(session, request.document_id, 'action_acknowledged', f'{request.action}: {acknowledgement.result}' + (f' · {acknowledgement.detail}' if acknowledgement.detail else ''))
            session.commit()
            return self._request(request)

    def revision_received(self, session, document, payload):
        state = session.get(DocumentWorkflow, document.id)
        if not state or state.status != 'awaiting_revision':
            return
        stamp = utc_now()
        status, assigned = self._default(payload)
        state.version += 1; state.status = status; state.assigned_to = assigned; state.updated_at = stamp
        pending = session.scalars(select(ActionRequest).where(ActionRequest.document_id == document.id, ActionRequest.status.in_(['pending', 'accepted']))).all()
        for request in pending:
            request.status = 'completed'; request.acknowledged_at = request.acknowledged_at or stamp
        self._activity(session, document.id, 'workflow_resumed', f'Revision {payload["revision"]} received; review resumed')
