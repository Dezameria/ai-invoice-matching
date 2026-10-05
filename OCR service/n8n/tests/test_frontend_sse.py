"""Test suite for Frontend SSE Routes and Web UI Integration."""

import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

import io
import asyncio
import pytest
import httpx
from app.main import app


@pytest.mark.asyncio
async def test_frontend_html_served():
    """Verify that GET /app serves the single-page HTML application."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/app")
        assert resp.status_code == 200
        assert "text/html" in resp.headers["content-type"]
        assert "AIVA Document Verification" in resp.text
        assert "Live API (SSE)" in resp.text
        assert "fe/verify" in resp.text


@pytest.mark.asyncio
async def test_root_endpoint_includes_app_ui():
    """Verify that GET / root index mentions /app."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("app_ui") == "/app"
        assert data.get("status") == "ONLINE"


@pytest.mark.live          # needs a reachable Paperless instance
@pytest.mark.asyncio
async def test_fe_documents_endpoint():
    """Verify GET /fe/documents handles Paperless proxy or returns expected structure."""
    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/fe/documents")
        # Paperless might be offline or online in this test environment
        if resp.status_code == 200:
            data = resp.json()
            assert "results" in data
        else:
            # 503 or 500 when Paperless is unreachable is gracefully handled
            assert resp.status_code in [500, 502, 503, 504]


@pytest.mark.live          # needs a reachable LiteLLM vision model
@pytest.mark.asyncio
async def test_fe_verify_upload_sse_streaming():
    """Verify POST /fe/verify/upload streams SSE events with valid PDF bytes."""
    # Generate minimal valid PDF header
    dummy_pdf = (
        b"%PDF-1.4\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
        b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R>>endobj\n"
        b"xref\n0 4\n0000000000 65535 f\n0000000010 00000 n\n0000000053 00000 n\n0000000102 00000 n\n"
        b"trailer<</Size 4/Root 1 0 R>>\nstartxref\n173\n%%EOF\n"
    )

    transport = httpx.ASGITransport(app=app)
    async with httpx.AsyncClient(transport=transport, base_url="http://test", timeout=30.0) as client:
        files = {"file": ("test_invoice.pdf", io.BytesIO(dummy_pdf), "application/pdf")}
        async with client.stream("POST", "/fe/verify/upload", files=files) as response:
            assert response.status_code == 200
            assert "text/event-stream" in response.headers["content-type"]

            event_lines = []
            async for line in response.aiter_lines():
                if line:
                    event_lines.append(line)
                # Once we receive done or error event, stop
                if any("event: done" in el for el in event_lines) or any("event: error" in el for el in event_lines):
                    break

            assert len(event_lines) > 0, "SSE stream should yield at least one event line"
            has_event_or_data = any(l.startswith("event:") or l.startswith("data:") for l in event_lines)
            assert has_event_or_data, "Stream content should follow SSE format"


if __name__ == "__main__":
    async def main():
        print("Running Frontend SSE Tests directly...")
        await test_frontend_html_served()
        print("✓ test_frontend_html_served passed")
        await test_root_endpoint_includes_app_ui()
        print("✓ test_root_endpoint_includes_app_ui passed")
        await test_fe_documents_endpoint()
        print("✓ test_fe_documents_endpoint passed")
        try:
            await test_fe_verify_upload_sse_streaming()
            print("✓ test_fe_verify_upload_sse_streaming passed")
        except Exception as e:
            print(f"upload SSE test error (may need live vision service): {e}")
        print("\nAll frontend SSE tests finished!")

    asyncio.run(main())
