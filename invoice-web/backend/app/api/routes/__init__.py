from .documents import create_documents_router
from .ingestion import create_ingestion_router
from .system import create_system_router
from .workflow import create_workflow_router

__all__ = ['create_documents_router', 'create_ingestion_router', 'create_system_router', 'create_workflow_router']
