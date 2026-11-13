from datetime import datetime, timezone
from uuid import uuid4

import httpx
import pytest

from ai_service.backend import BackendClient


def payload(client):
    return client.send(event_id=uuid4(), session_id=uuid4(), event_at=datetime.now(timezone.utc),
                       emoji_type="HAPPY", confidence=0.91, source_id="camera-01")


def test_client_accepts_created_and_sends_service_token():
    def handler(request: httpx.Request):
        assert request.headers["Authorization"] == "Bearer " + "x" * 32
        assert request.url.path.endswith("/ai/emoji-results")
        return httpx.Response(201, json={"data": {"id": "1"}, "meta": {"idempotent_replay": False}})
    with BackendClient("http://backend/api/v1", "x" * 32, transport=httpx.MockTransport(handler)) as client:
        assert payload(client)["meta"]["idempotent_replay"] is False


def test_client_does_not_retry_validation_error():
    attempts = 0
    def handler(_request: httpx.Request):
        nonlocal attempts
        attempts += 1
        return httpx.Response(422, json={"error": {"message": "低于阈值"}})
    with BackendClient("http://backend/api/v1", "x" * 32, max_retries=4, transport=httpx.MockTransport(handler)) as client:
        with pytest.raises(RuntimeError, match="低于阈值"):
            payload(client)
    assert attempts == 1
