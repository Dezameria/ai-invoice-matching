from fastapi import APIRouter, Depends, Query

from ...core.config import API_PREFIX
from ...domain.workflow import ActionAcknowledge, ActionCreate


def create_workflow_router(workflow, policy):
    router = APIRouter(prefix=API_PREFIX)

    @router.post('/documents/{document_id}/actions', dependencies=[Depends(policy.read)])
    def create_action(document_id: str, command: ActionCreate):
        return workflow.create_action(document_id, command)

    @router.get('/action-requests', dependencies=[Depends(policy.ingest)])
    def action_requests(
        status: str = 'pending', source_system: str = '', page: int = Query(1, ge=1),
        page_size: int = Query(50, ge=1, le=100),
    ):
        return workflow.list_requests(status, source_system, page, page_size)

    @router.post('/action-requests/{action_id}/ack', dependencies=[Depends(policy.ingest)])
    def acknowledge_action(action_id: str, acknowledgement: ActionAcknowledge):
        return workflow.acknowledge(action_id, acknowledgement)

    return router
