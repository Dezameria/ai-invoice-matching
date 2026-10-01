"""Paperless-ngx REST API Client (N2, N2.3, N13, N13.1).

Handles document fetching, PDF downloading, preview/thumbnail extraction,
and tagging to prevent duplicate processing.
"""

import logging
from typing import Optional, Dict, Any, List, Tuple
import httpx

from app.config import get_settings

logger = logging.getLogger(__name__)


class PaperlessClient:
    """Client for Paperless-ngx Document Management System."""

    def __init__(
        self,
        base_url: Optional[str] = None,
        token: Optional[str] = None,
        timeout: Optional[float] = None
    ):
        settings = get_settings()
        self.base_url = (base_url or settings.PAPERLESS_BASE_URL).rstrip("/")
        self.token = token or settings.PAPERLESS_API_TOKEN
        self.timeout = timeout or settings.PAPERLESS_TIMEOUT_SECONDS
        self.invoice_tag_id = settings.PAPERLESS_TAG_INVOICE_ID
        self.checked_tag_id = settings.PAPERLESS_TAG_CHECKED_ID

    def _headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/json",
        }
        if self.token and self.token != "your_paperless_token_here":
            headers["Authorization"] = f"Token {self.token}"
        return headers

    async def get_next_unprocessed_document(
        self,
        tag_id: Optional[int] = None,
        excluded_tag_id: Optional[int] = None
    ) -> Optional[Dict[str, Any]]:
        """Fetch next document that has `tag_id` and does not have `excluded_tag_id` (N2)."""
        tag = tag_id or self.invoice_tag_id
        excluded = excluded_tag_id or self.checked_tag_id

        url = f"{self.base_url}/api/documents/"
        params = {
            "tags__id__in": tag,
            "tags__id__none": excluded,
            "ordering": "-created",
            "page_size": 1
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, params=params, headers=self._headers())
                response.raise_for_status()
                data = response.json()
                results = data.get("results") or []
                return results[0] if results else None
        except Exception as e:
            logger.error(f"Paperless get_next_unprocessed_document failed: {e}")
            raise

    async def download_document_pdf(self, doc_id: int) -> bytes:
        """Download document original PDF binary (Get a document)."""
        url = f"{self.base_url}/api/documents/{doc_id}/download/"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._headers())
                response.raise_for_status()
                return response.content
        except Exception as e:
            logger.error(f"Failed to download document {doc_id} from Paperless: {e}")
            raise

    async def get_document_thumbnail(self, doc_id: int) -> Optional[Tuple[str, bytes]]:
        """Download document rendered preview/thumbnail image (N2.3)."""
        url = f"{self.base_url}/api/documents/{doc_id}/thumb/"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url, headers=self._headers())
                if response.status_code == 200:
                    mime = response.headers.get("content-type", "image/png")
                    return (mime, response.content)
                return None
        except Exception as e:
            logger.warning(f"Failed to get thumbnail for doc {doc_id}: {e}")
            return None

    async def get_document_details(self, doc_id: int) -> Dict[str, Any]:
        """Get document metadata and current tags."""
        url = f"{self.base_url}/api/documents/{doc_id}/"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(url, headers=self._headers())
            response.raise_for_status()
            return response.json()

    async def append_tag(self, doc_id: int, tag_id: int) -> List[int]:
        """Append a tag to a document without removing existing tags (N13.1)."""
        doc = await self.get_document_details(doc_id)
        current_tags = list(doc.get("tags") or [])

        if tag_id not in current_tags:
            current_tags.append(tag_id)
            url = f"{self.base_url}/api/documents/{doc_id}/"
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                patch_res = await client.patch(
                    url,
                    json={"tags": current_tags},
                    headers={**self._headers(), "Content-Type": "application/json"}
                )
                patch_res.raise_for_status()
                updated_doc = patch_res.json()
                return updated_doc.get("tags", current_tags)

        return current_tags

    async def update_verification_status(
        self,
        doc_id: int,
        status: str,
        validation_round: int = 1,
        exceptions_str: str = "",
        append_checked_tag: bool = True
    ) -> Dict[str, Any]:
        """Update Paperless custom fields and status tags based on verification decision (N13)."""
        doc = await self.get_document_details(doc_id)
        current_tags = list(doc.get("tags") or [])

        # Add checked tag (ID 12) if requested
        if append_checked_tag and self.checked_tag_id not in current_tags:
            current_tags.append(self.checked_tag_id)

        update_payload = {
            "tags": current_tags,
        }

        url = f"{self.base_url}/api/documents/{doc_id}/"
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.patch(
                    url,
                    json=update_payload,
                    headers={**self._headers(), "Content-Type": "application/json"}
                )
                response.raise_for_status()
                return {
                    "doc_id": doc_id,
                    "status": status,
                    "updated_tags": current_tags,
                    "tag_added": f"Tag ID {self.checked_tag_id}",
                    "deduplicated": True
                }
        except Exception as e:
            logger.error(f"Failed to update Paperless doc {doc_id}: {e}")
            return {
                "doc_id": doc_id,
                "status": status,
                "error": str(e),
                "deduplicated": False
            }
