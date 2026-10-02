from sqlalchemy import JSON, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class Document(Base):
    __tablename__ = 'documents'
    __table_args__ = (UniqueConstraint('source_system', 'external_id'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    source_system: Mapped[str] = mapped_column(String(200), index=True)
    external_id: Mapped[str] = mapped_column(String(200))
    revision: Mapped[int] = mapped_column(Integer)
    company: Mapped[str] = mapped_column(String(200), index=True)
    status: Mapped[str] = mapped_column(String(30), index=True)
    search_text: Mapped[str] = mapped_column(Text)
    payload: Mapped[dict] = mapped_column(JSON)
    updated_at: Mapped[str] = mapped_column(String(40))
    pdf_hash: Mapped[str | None] = mapped_column(String(64))
    pdf_pages: Mapped[int | None] = mapped_column(Integer)
    pdf_revision: Mapped[int | None] = mapped_column(Integer)


class Event(Base):
    __tablename__ = 'events'
    __table_args__ = (UniqueConstraint('source_system', 'event_id'), UniqueConstraint('document_id', 'revision'))
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    source_system: Mapped[str] = mapped_column(String(200))
    event_id: Mapped[str] = mapped_column(String(200))
    document_id: Mapped[str] = mapped_column(ForeignKey('documents.id'), index=True)
    revision: Mapped[int] = mapped_column(Integer)
    fingerprint: Mapped[str] = mapped_column(String(64))
    payload: Mapped[dict] = mapped_column(JSON)
    received_at: Mapped[str] = mapped_column(String(40))


class PdfAttachment(Base):
    __tablename__ = 'pdf_attachments'
    __table_args__ = (UniqueConstraint('document_id', 'revision'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey('documents.id'), index=True)
    revision: Mapped[int] = mapped_column(Integer)
    content_hash: Mapped[str] = mapped_column(String(64))
    pages: Mapped[int] = mapped_column(Integer)
    attached_at: Mapped[str] = mapped_column(String(40))


class Activity(Base):
    __tablename__ = 'activities'
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    document_id: Mapped[str] = mapped_column(ForeignKey('documents.id'), index=True)
    kind: Mapped[str] = mapped_column(String(30))
    detail: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[str] = mapped_column(String(40))


class DocumentWorkflow(Base):
    __tablename__ = 'document_workflows'
    document_id: Mapped[str] = mapped_column(ForeignKey('documents.id'), primary_key=True)
    version: Mapped[int] = mapped_column(Integer)
    status: Mapped[str] = mapped_column(String(40), index=True)
    assigned_to: Mapped[str] = mapped_column(String(40))
    last_action_id: Mapped[str | None] = mapped_column(String(36))
    updated_at: Mapped[str] = mapped_column(String(40))


class ActionRequest(Base):
    __tablename__ = 'action_requests'
    __table_args__ = (UniqueConstraint('request_id'),)
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    request_id: Mapped[str] = mapped_column(String(200), index=True)
    document_id: Mapped[str] = mapped_column(ForeignKey('documents.id'), index=True)
    action: Mapped[str] = mapped_column(String(30), index=True)
    reason_code: Mapped[str] = mapped_column(String(80))
    reason_label: Mapped[str] = mapped_column(String(300))
    note: Mapped[str | None] = mapped_column(String(2000))
    new_receipt_num: Mapped[str | None] = mapped_column(String(200))
    expected_revision: Mapped[int] = mapped_column(Integer)
    requested_by: Mapped[str] = mapped_column(String(100))
    status: Mapped[str] = mapped_column(String(30), index=True)
    fingerprint: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[str] = mapped_column(String(40))
    acknowledged_at: Mapped[str | None] = mapped_column(String(40))
    acknowledgement_detail: Mapped[str | None] = mapped_column(String(500))
