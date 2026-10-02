"""AIVA receiving portal application factory."""
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from starlette.middleware.trustedhost import TrustedHostMiddleware

from .api.http import install_http_boundaries
from .api.routes import create_documents_router, create_ingestion_router, create_system_router, create_workflow_router
from .auth import AccessPolicy
from .core.config import API_PREFIX, MAX_PDF_BYTES, ROOT, load_settings
from .db.session import create_database
from .domain.documents import DocumentService
from .domain.workflow import WorkflowService
from .storage import PdfFileStore

PREFIX = API_PREFIX  # Backward-compatible import used by existing clients/tests.


def create_app(data_dir=None, portal_key=None, ingest_key=None):
    settings = load_settings(data_dir, portal_key, ingest_key)
    engine = create_database(settings.storage)
    files = PdfFileStore(settings.storage / 'pdf', MAX_PDF_BYTES)
    workflow = WorkflowService(engine)
    documents = DocumentService(engine, files.directory, workflow)
    policy = AccessPolicy(settings.read_key, settings.write_key)

    @asynccontextmanager
    async def lifespan(_app):
        yield
        engine.dispose()

    app = FastAPI(
        title='AIVA Receiving Portal API', version='0.1.0', docs_url='/api/docs',
        openapi_url='/api/openapi.json', redoc_url=None, lifespan=lifespan,
    )
    app.state.engine = engine
    app.state.settings = settings
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=list(settings.allowed_hosts))
    install_http_boundaries(app, settings)
    app.include_router(create_system_router(policy, settings.mode))
    app.include_router(create_ingestion_router(documents, policy))
    app.include_router(create_documents_router(documents, files, policy))
    app.include_router(create_workflow_router(workflow, policy))

    dist = ROOT / 'frontend' / 'dist'
    if dist.exists():
        app.mount('/', StaticFiles(directory=dist, html=True), name='web')
    return app


app = create_app()
