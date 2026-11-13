from __future__ import annotations

import logging
from datetime import datetime, timezone
from uuid import NAMESPACE_URL, uuid5

import cv2

from ai_service.backend import BackendClient
from ai_service.detectors import Detector, create_detector
from ai_service.settings import Settings

logger = logging.getLogger(__name__)


def event_id(session_id, source_id: str, captured_at: datetime, frame_index: int, face_index: int):
    identity = f"emoji-checker:{session_id}:{source_id}:{captured_at.isoformat()}:{frame_index}:{face_index}"
    return uuid5(NAMESPACE_URL, identity)


def run(settings: Settings, detector: Detector | None = None, client: BackendClient | None = None,
        capture_factory=cv2.VideoCapture, max_frames: int | None = None) -> int:
    detector = detector or create_detector(settings.detector_backend, settings.onnx_model_path)
    owns_client = client is None
    client = client or BackendClient(
        str(settings.backend_api_url), settings.api_token.get_secret_value(),
        timeout=settings.request_timeout_seconds, max_retries=settings.max_retries,
    )
    capture = capture_factory(settings.capture_source)
    if not capture.isOpened():
        if owns_client:
            client.close()
        raise RuntimeError(f"无法打开视频源：{settings.video_source}")

    fps = float(capture.get(cv2.CAP_PROP_FPS) or 0)
    if fps <= 0 or fps > 240:
        fps = 30.0
    sample_every = max(1, round(fps * settings.sample_interval_seconds))
    frame_index = 0
    submitted = 0
    consecutive_failures = 0
    logger.info("AI 推理已启动 source=%s backend=%s sample_every=%s", settings.source_id, settings.detector_backend, sample_every)

    try:
        while max_frames is None or frame_index < max_frames:
            ok, frame = capture.read()
            if not ok:
                consecutive_failures += 1
                if consecutive_failures >= 3:
                    break
                continue
            consecutive_failures = 0
            current_index = frame_index
            frame_index += 1
            if current_index % sample_every:
                continue
            captured_at = datetime.now(timezone.utc)
            for face_index, prediction in enumerate(detector.predict(frame)):
                if prediction.confidence < settings.confidence_threshold:
                    continue
                client.send(
                    event_id=event_id(settings.session_id, settings.source_id, captured_at, current_index, face_index),
                    session_id=settings.session_id,
                    event_at=captured_at,
                    emoji_type=prediction.emoji_type,
                    confidence=prediction.confidence,
                    source_id=settings.source_id,
                )
                submitted += 1
                logger.info("已提交情绪 frame=%s face=%s emoji=%s confidence=%.3f",
                            current_index, face_index, prediction.emoji_type, prediction.confidence)
    finally:
        capture.release()
        if owns_client:
            client.close()
    logger.info("AI 推理结束 frames=%s submitted=%s", frame_index, submitted)
    return submitted
