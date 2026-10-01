"""FastAPI Application Entry Point.

AIVA PO-INV Matching Verification Service (Standard v6.2).
"""

import logging
import os
import sys
from pathlib import Path

# Ensure project root is in sys.path so 'import app...' works from any working directory
_ROOT = Path(__file__).resolve().parent.parent
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

from app.config import get_settings
from app.api.routes import router
from app.api.frontend_routes import fe_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

settings = get_settings()

app = FastAPI(
    title=settings.APP_NAME,
    version="6.2.0",
    description=(
        "Production-grade Python API for automated 3-Way PO-INV Matching verification "
        "according to Standard v6.2 (AH-IT-DOC-PO-INV-Matching-Standard-v6.2-DRAFT-260930-WT)."
    ),
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routes
app.include_router(router, prefix="/api/v1")
app.include_router(router)  # also expose directly at root for convenience
app.include_router(fe_router)  # Frontend SSE & proxy routes (/fe/*)

HTML_PATH = Path(__file__).parent / "AIVA-Document-Card-Verification-v3.html"


@app.get("/app", summary="AIVA Document Verification Web UI")
async def serve_frontend():
    """Serve the AIVA Document Card Verification single-page HTML application."""
    if not HTML_PATH.exists():
        return {"error": "HTML template not found", "path": str(HTML_PATH)}
    return FileResponse(
        str(HTML_PATH),
        media_type="text/html",
        headers={"Cache-Control": "no-cache"}
    )


@app.get("/", summary="Root Index")
async def root():
    return {
        "service": settings.APP_NAME,
        "standard_version": "6.2",
        "documentation": "/docs",
        "app_ui": "/app",
        "status": "ONLINE"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=settings.DEBUG
    )
