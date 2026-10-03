import hashlib
import json
from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException
from sqlalchemy import func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from ...core.time import utc_now
from ...db.models import Activity, Document, Event, PdfAttachment
from .schemas import Snapshot


class DocumentService:
    def __init__(self, engine, pdf_directory: Path, workflow=None):
        self.engine = engine
        self.pdf_directory = pdf_directory
        self.workflow = workflow

    @staticmethod
    def _get_document(session, document_id):
        document = session.get(Document, document_id)
        if not document:
            raise HTTPException(404, 'Document not found.')
        return document

    @staticmethod
    def _activity(session, document_id, kind, detail):
        session.add(Activity(id=str(uuid4()), document_id=document_id, kind=kind, detail=detail, created_at=utc_now()))

    def _attachment_for(self, session, document, revision, allow_older=False):
        query = select(PdfAttachment).where(PdfAttachment.document_id == document.id)
        if allow_older:
            query = query.where(PdfAttachment.revision <= revision).order_by(PdfAttachment.revision.desc())
        else:
            query = query.where(PdfAttachment.revision == revision)
        for attachment in session.scalars(query).all():
            if (self.pdf_directory / (attachment.content_hash + '.pdf')).exists():
                return attachment
        return None

    def _revision_index(self, session, document):
        events = session.scalars(select(Event).where(Event.document_id == document.id).order_by(Event.revision.desc())).all()
        attachments = {
            item.revision: item for item in session.scalars(
                select(PdfAttachment).where(PdfAttachment.document_id == document.id)
            ).all() if (self.pdf_directory / (item.content_hash + '.pdf')).exists()
        }
        return [{
            'revision': event.revision,
            'status': event.payload['status'],
            'received_at': event.received_at,
            'event_id': event.event_id,
            'pdf': {'available': event.revision in attachments, 'pages': attachments[event.revision].pages if event.revision in attachments else None},
        } for event in events]

    def _present(self, session, document, full=False, selected_revision=None):
        viewed_revision = selected_revision or document.revision
        event = None
        if viewed_revision != document.revision:
            event = session.scalar(select(Event).where(Event.document_id == document.id, Event.revision == viewed_revision))
            if not event:
                raise HTTPException(404, 'Revision not found.')
        payload = event.payload if event else document.payload
        attachment = self._attachment_for(session, document, viewed_revision, allow_older=viewed_revision == document.revision)
        invoice = payload['invoice']
        result = {
            'id': document.id, 'source_system': document.source_system, 'external_id': document.external_id,
            'revision': viewed_revision, 'current_revision': document.revision, 'is_current': viewed_revision == document.revision,
            'status': payload['status'], 'company': invoice['company'], 'invoice': invoice,
            'receipt': payload.get('receipt'),
            'updated_at': event.received_at if event else document.updated_at,
            'pdf': {
                'available': bool(attachment), 'pages': attachment.pages if attachment else None,
                'revision': attachment.revision if attachment else None,
                'stale': bool(attachment and attachment.revision != viewed_revision),
            },
        }
        if self.workflow:
            result['workflow'] = self.workflow.summary(session, document, payload, include_requests=full)
        if full:
            result['snapshot'] = payload
            result['revisions'] = self._revision_index(session, document)
        return result

    def ingest(self, payload: Snapshot):
        normalized = payload.model_dump(mode='json')
        fingerprint = hashlib.sha256(json.dumps(normalized, sort_keys=True, ensure_ascii=False).encode()).hexdigest()
        with Session(self.engine) as session:
            old = session.scalar(select(Event).where(Event.source_system == payload.source_system, Event.event_id == payload.event_id))
            if old:
                if old.fingerprint != fingerprint:
                    raise HTTPException(409, 'event_id was already used with different data.')
                return {'id': old.document_id, 'revision': old.revision, 'duplicate': True}
            document = session.scalar(select(Document).where(Document.source_system == payload.source_system, Document.external_id == payload.external_id))
            if document and payload.revision <= document.revision:
                raise HTTPException(409, 'revision must be newer than the stored revision.')
            stamp = utc_now()
            values = dict(
                revision=payload.revision, company=payload.invoice.company, status=payload.status,
                payload=normalized, updated_at=stamp,
                search_text=' '.join(filter(None, [payload.external_id, payload.invoice.invoice_num, payload.invoice.supplier_name, payload.invoice.po_number])).lower(),
            )
            if not document:
                document = Document(id=str(uuid4()), source_system=payload.source_system, external_id=payload.external_id, **values)
                session.add(document)
            else:
                changed = session.execute(update(Document).where(Document.id == document.id, Document.revision == document.revision).values(**values))
                if changed.rowcount != 1:
                    raise HTTPException(409, 'Document changed; reload and retry.')
            session.add(Event(
                id=str(uuid4()), source_system=payload.source_system, event_id=payload.event_id,
                document_id=document.id, revision=payload.revision, fingerprint=fingerprint,
                payload=normalized, received_at=stamp,
            ))
            if self.workflow:
                self.workflow.revision_received(session, document, normalized)
            self._activity(session, document.id, 'received', f'Received revision {payload.revision} from {payload.source_system}')
            try:
                session.commit()
            except IntegrityError:
                session.rollback()
                raise HTTPException(409, 'Concurrent event received; retry with the same event_id.')
            return {'id': document.id, 'revision': payload.revision, 'duplicate': False}

    def list_documents(self, q='', status='', company='', source='', page=1, page_size=25):
        with Session(self.engine) as session:
            filters = []
            if q.strip():
                filters.append(Document.search_text.contains(q.strip().lower(), autoescape=True))
            if company:
                filters.append(Document.company == company)
            if source:
                filters.append(Document.source_system == source)
            counts = dict(session.execute(select(Document.status, func.count()).where(*filters).group_by(Document.status)).all())
            if status:
                filters.append(Document.status == status)
            total = session.scalar(select(func.count()).select_from(Document).where(*filters))
            documents = session.scalars(select(Document).where(*filters).order_by(Document.updated_at.desc(), Document.id).offset((page - 1) * page_size).limit(page_size)).all()
            return {
                'items': [self._present(session, document) for document in documents], 'total': total,
                'page': page, 'page_size': page_size, 'counts': counts,
                'companies': list(session.scalars(select(Document.company).distinct().order_by(Document.company))),
                'sources': list(session.scalars(select(Document.source_system).distinct().order_by(Document.source_system))),
            }

    def detail(self, document_id, revision=None):
        with Session(self.engine) as session:
            return self._present(session, self._get_document(session, document_id), full=True, selected_revision=revision)

    def revisions(self, document_id):
        with Session(self.engine) as session:
            return self._revision_index(session, self._get_document(session, document_id))

    def history(self, document_id):
        with Session(self.engine) as session:
            self._get_document(session, document_id)
            activities = session.scalars(select(Activity).where(Activity.document_id == document_id).order_by(Activity.created_at.desc()).limit(100))
            return [{'id': item.id, 'kind': item.kind, 'detail': item.detail, 'created_at': item.created_at} for item in activities]

    def audit_events(self, q='', kind='', page=1, page_size=50):
        with Session(self.engine) as session:
            filters = []
            if q.strip():
                term = q.strip().lower()
                filters.append(or_(Document.search_text.contains(term, autoescape=True), Activity.detail.contains(q.strip(), autoescape=True)))
            if kind:
                filters.append(Activity.kind == kind)
            source = select(Activity, Document).join(Document, Document.id == Activity.document_id).where(*filters)
            total = session.scalar(select(func.count()).select_from(Activity).join(Document, Document.id == Activity.document_id).where(*filters))
            rows = session.execute(source.order_by(Activity.created_at.desc(), Activity.id).offset((page - 1) * page_size).limit(page_size)).all()
            kinds = list(session.scalars(select(Activity.kind).distinct().order_by(Activity.kind)))
            return {
                'items': [{
                    'id': activity.id, 'kind': activity.kind, 'detail': activity.detail,
                    'created_at': activity.created_at, 'document_id': document.id,
                    'invoice_num': document.payload['invoice']['invoice_num'],
                    'external_id': document.external_id, 'company': document.company,
                    'source_system': document.source_system,
                } for activity, document in rows],
                'total': total, 'page': page, 'page_size': page_size, 'kinds': kinds,
            }

    def revision_snapshot(self, document_id, revision):
        with Session(self.engine) as session:
            event = session.scalar(select(Event).where(Event.document_id == document_id, Event.revision == revision))
            if not event:
                raise HTTPException(404, 'Revision not found.')
            return event.payload

    def ensure_revision(self, document_id, revision):
        with Session(self.engine) as session:
            document = self._get_document(session, document_id)
            event = session.scalar(select(Event).where(Event.document_id == document.id, Event.revision == revision))
            if not event:
                raise HTTPException(404, 'Revision not found.')

    def attach_pdf(self, document_id, revision, digest, pages):
        with Session(self.engine) as session:
            document = self._get_document(session, document_id)
            event = session.scalar(select(Event).where(Event.document_id == document.id, Event.revision == revision))
            if not event:
                raise HTTPException(404, 'Revision not found.')
            attachment = session.scalar(select(PdfAttachment).where(PdfAttachment.document_id == document_id, PdfAttachment.revision == revision))
            stamp = utc_now()
            if attachment:
                attachment.content_hash, attachment.pages, attachment.attached_at = digest, pages, stamp
            else:
                session.add(PdfAttachment(id=str(uuid4()), document_id=document_id, revision=revision, content_hash=digest, pages=pages, attached_at=stamp))
            if document.pdf_revision is None or revision >= document.pdf_revision:
                document.pdf_hash, document.pdf_pages, document.pdf_revision = digest, pages, revision
            self._activity(session, document_id, 'pdf_attached', f'PDF attached to revision {revision} ({pages} pages)')
            session.commit()

    def open_pdf(self, document_id, revision=None):
        with Session(self.engine) as session:
            document = self._get_document(session, document_id)
            requested_revision = revision or document.revision
            attachment = self._attachment_for(session, document, requested_revision, allow_older=revision is None)
            if not attachment:
                raise HTTPException(404, 'No PDF is attached.')
            path = self.pdf_directory / (attachment.content_hash + '.pdf')
            self._activity(session, document_id, 'pdf_viewed', f'PDF revision {attachment.revision} opened')
            session.commit()
            return path
