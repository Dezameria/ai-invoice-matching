from fastapi import APIRouter, Depends, File, Query, UploadFile
from fastapi.responses import FileResponse

from ...core.config import API_PREFIX


def create_documents_router(service, files, policy):
    router = APIRouter(prefix=API_PREFIX)

    @router.get('/documents', dependencies=[Depends(policy.read)])
    def documents(q: str = Query(default='', max_length=200), status: str = '', company: str = '', source: str = '', page: int = Query(1, ge=1), page_size: int = Query(25, ge=1, le=100)):
        return service.list_documents(q, status, company, source, page, page_size)

    @router.get('/documents/{document_id}', dependencies=[Depends(policy.read)])
    def detail(document_id: str, revision: int | None = Query(default=None, ge=1)):
        return service.detail(document_id, revision)

    @router.get('/documents/{document_id}/revisions', dependencies=[Depends(policy.read)])
    def revisions(document_id: str):
        return service.revisions(document_id)

    @router.get('/documents/{document_id}/history', dependencies=[Depends(policy.read)])
    def history(document_id: str):
        return service.history(document_id)

    @router.get('/documents/{document_id}/revisions/{revision}', dependencies=[Depends(policy.read)])
    def revision_snapshot(document_id: str, revision: int):
        return service.revision_snapshot(document_id, revision)

    @router.get('/audit-events', dependencies=[Depends(policy.read)])
    def audit_events(q: str = Query(default='', max_length=200), kind: str = '', page: int = Query(1, ge=1), page_size: int = Query(50, ge=1, le=100)):
        return service.audit_events(q, kind, page, page_size)

    @router.post('/documents/{document_id}/pdf', dependencies=[Depends(policy.either)])
    async def attach_pdf(document_id: str, revision: int = Query(ge=1), file: UploadFile = File()):
        service.ensure_revision(document_id, revision)
        content = await file.read(files.maximum_bytes + 1)
        await file.close()
        digest, pages = files.validate_and_store(content)
        service.attach_pdf(document_id, revision, digest, pages)
        return {'pages': pages, 'revision': revision, 'sha256': digest}

    @router.get('/documents/{document_id}/pdf', dependencies=[Depends(policy.read)])
    def pdf(document_id: str, revision: int | None = Query(default=None, ge=1)):
        return FileResponse(service.open_pdf(document_id, revision), media_type='application/pdf', filename='document.pdf', content_disposition_type='inline')

    return router
