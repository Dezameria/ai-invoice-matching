from fastapi import APIRouter, Depends

from ...core.config import API_PREFIX
from ...domain.documents.schemas import Snapshot


def create_ingestion_router(service, policy):
    router = APIRouter(prefix=API_PREFIX)

    @router.post('/ingest', dependencies=[Depends(policy.ingest)], status_code=201)
    def receive(payload: Snapshot):
        return service.ingest(payload)

    @router.post('/imports', dependencies=[Depends(policy.read)], status_code=201)
    def manual_import(payload: Snapshot):
        return service.ingest(payload)

    return router
