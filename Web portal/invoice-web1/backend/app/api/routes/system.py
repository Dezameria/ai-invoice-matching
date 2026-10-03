from fastapi import APIRouter, Depends

from ...core.config import API_PREFIX
from ...domain.documents.schemas import Snapshot


def create_system_router(policy, mode):
    router = APIRouter(prefix=API_PREFIX)

    @router.get('/health')
    def health():
        return {'status': 'ok', 'mode': mode, 'product': 'receiving-portal', 'schema_version': '1.0'}

    @router.get('/session', dependencies=[Depends(policy.read)])
    def session_info():
        return {
            'workspace': 'AIVA', 'mode': mode,
            'permissions': ['read', 'manual_import', 'attach_pdf', 'view_audit', 'review_actions'],
            'rbac': False,
            'capabilities': {
                'receive_json': True, 'browse_revisions': True, 'view_pdf': True,
                'view_audit': True, 'workflow_actions': True, 'action_outbox': True, 'ap_submission': False,
            },
        }

    @router.get('/schema', dependencies=[Depends(policy.either)])
    def schema():
        return Snapshot.model_json_schema()

    return router
