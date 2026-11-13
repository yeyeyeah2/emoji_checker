from datetime import datetime, timezone
from uuid import UUID

import numpy as np

from ai_service.emotions import Prediction
from ai_service.runner import event_id, run
from ai_service.settings import Settings


class FakeCapture:
    def __init__(self, _source):
        self.frames = [np.zeros((48, 48, 3), dtype=np.uint8) for _ in range(4)]
    def isOpened(self): return True
    def get(self, _key): return 1
    def read(self): return (True, self.frames.pop(0)) if self.frames else (False, None)
    def release(self): pass


class FakeDetector:
    def predict(self, _frame):
        return [Prediction("happy", 0.9, (0, 0, 10, 10)), Prediction("sad", 0.2, (1, 1, 10, 10))]


class FakeClient:
    def __init__(self): self.calls = []
    def send(self, **payload): self.calls.append(payload); return {"data": {}}


def settings():
    return Settings(api_token="x" * 32, session_id=UUID("00000000-0000-0000-0000-000000000001"),
                    detector_backend="mock", allow_mock=True, sample_interval_seconds=2,
                    confidence_threshold=0.6)


def test_runner_samples_filters_and_submits_without_storing_frames():
    client = FakeClient()
    submitted = run(settings(), detector=FakeDetector(), client=client, capture_factory=FakeCapture, max_frames=4)
    assert submitted == 2
    assert [call["emoji_type"] for call in client.calls] == ["HAPPY", "HAPPY"]
    assert client.calls[0]["source_id"] == "classroom-camera-01"


def test_event_id_is_deterministic_for_idempotent_retry():
    captured_at = datetime(2026, 11, 13, 9, 30, tzinfo=timezone.utc)
    later = datetime(2026, 11, 13, 9, 31, tzinfo=timezone.utc)
    first = event_id(settings().session_id, "camera-01", captured_at, 4, 0)
    assert first == event_id(settings().session_id, "camera-01", captured_at, 4, 0)
    assert first != event_id(settings().session_id, "camera-01", captured_at, 5, 0)
    assert first != event_id(settings().session_id, "camera-01", later, 4, 0)
