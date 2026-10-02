from pathlib import Path
from uuid import uuid4

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from .models import Base, Document, PdfAttachment


def create_database(storage: Path):
    storage.mkdir(parents=True, exist_ok=True)
    pdf_directory = storage / 'pdf'
    pdf_directory.mkdir(exist_ok=True)
    engine = create_engine(
        'sqlite:///' + (storage / 'portal.sqlite3').as_posix(),
        connect_args={'check_same_thread': False, 'timeout': 20},
    )
    Base.metadata.create_all(engine)
    _backfill_legacy_attachments(engine, pdf_directory)
    return engine


def _backfill_legacy_attachments(engine, pdf_directory: Path):
    """Bridge pilot databases created before PDF revisions had their own table."""
    with Session(engine) as session:
        documents = session.scalars(
            select(Document).where(Document.pdf_hash.is_not(None), Document.pdf_revision.is_not(None))
        ).all()
        for document in documents:
            if not (pdf_directory / (document.pdf_hash + '.pdf')).exists():
                continue
            existing = session.scalar(select(PdfAttachment).where(
                PdfAttachment.document_id == document.id,
                PdfAttachment.revision == document.pdf_revision,
            ))
            if not existing:
                session.add(PdfAttachment(
                    id=str(uuid4()), document_id=document.id, revision=document.pdf_revision,
                    content_hash=document.pdf_hash, pages=document.pdf_pages or 1,
                    attached_at=document.updated_at,
                ))
        session.commit()
