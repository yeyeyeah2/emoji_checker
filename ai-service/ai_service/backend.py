from __future__ import annotations

import logging
import time
from datetime import datetime
from uuid import UUID

import httpx

logger = logging.getLogger(__name__)


class BackendClient:
    def __init__(self, api_url: str, token: str, timeout: float = 10, max_retries: int = 4,
                 transport: httpx.BaseTransport | None = None):
        self.max_retries = max_retries
        self.client = httpx.Client(
            base_url=api_url.rstrip("/"), timeout=timeout,
            headers={"Authorization": f"Bearer {token}"}, transport=transport,
        )

    def close(self) -> None:
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        self.close()

    def send(self, *, event_id: UUID, session_id: UUID, event_at: datetime,
             emoji_type: str, confidence: float, source_id: str) -> dict:
        payload = {
            "event_id": str(event_id), "session_id": str(session_id),
            "event_at": event_at.isoformat(), "emoji_type": emoji_type,
            "confidence": confidence, "source_id": source_id,
        }
        for attempt in range(self.max_retries):
            try:
                response = self.client.post("/ai/emoji-results", json=payload)
                if response.status_code in (200, 201):
                    return response.json()
                if response.status_code != 429 and response.status_code < 500:
                    raise RuntimeError(_error_message(response))
                logger.warning("后端暂时失败 status=%s attempt=%s", response.status_code, attempt + 1)
            except (httpx.TimeoutException, httpx.NetworkError) as error:
                logger.warning("后端连接失败 attempt=%s error=%s", attempt + 1, error)
            if attempt + 1 < self.max_retries:
                time.sleep(min(2 ** attempt, 8))
        raise RuntimeError(f"AI 结果入库失败，已重试 {self.max_retries} 次")


def _error_message(response: httpx.Response) -> str:
    try:
        body = response.json()
        message = body.get("error", {}).get("message")
    except ValueError:
        message = None
    return message or f"后端拒绝 AI 结果（HTTP {response.status_code}）"
