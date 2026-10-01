"""AIVA Portal Notification Service (N12).

Dispatches verification results (Table 9 JSON) to AIVA Portal or downstream webhooks.
"""

import logging
from typing import Dict, Any, Optional
import httpx

from app.config import get_settings
from app.core.models import Table9Output

logger = logging.getLogger(__name__)


class PortalClient:
    """Client for notifying AIVA Portal with Table 9 verification output."""

    def __init__(
        self,
        portal_url: Optional[str] = None,
        token: Optional[str] = None,
        timeout: float = 15.0
    ):
        settings = get_settings()
        self.portal_url = portal_url or settings.PORTAL_API_URL
        self.token = token or settings.PORTAL_API_TOKEN
        self.timeout = timeout

    async def post_verification_result(self, table9_output: Table9Output) -> Dict[str, Any]:
        """Send Table 9 JSON payload to Portal webhook/API (N12)."""
        if not self.portal_url:
            return {"status": "SKIPPED", "message": "Portal URL not configured"}

        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"

        payload = table9_output.model_dump()
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(self.portal_url, json=payload, headers=headers)
                return {
                    "status": "SENT" if response.is_success else "FAILED",
                    "status_code": response.status_code,
                    "response": response.json() if "application/json" in response.headers.get("content-type", "") else response.text
                }
        except Exception as e:
            logger.warning(f"Failed to post verification to Portal: {e}")
            return {"status": "ERROR", "error": str(e)}
