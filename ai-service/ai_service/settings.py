from pathlib import Path
from typing import Literal
from uuid import UUID

from pydantic import Field, HttpUrl, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_prefix="AI_", extra="ignore")

    backend_api_url: HttpUrl = "http://localhost:8000/api/v1"
    api_token: SecretStr = Field(min_length=32)
    session_id: UUID
    video_source: str = "0"
    source_id: str = Field(default="classroom-camera-01", min_length=1, max_length=120)
    detector_backend: Literal["onnx", "fer", "mock"] = "onnx"
    onnx_model_path: Path | None = None
    confidence_threshold: float = Field(default=0.60, ge=0, le=1, allow_inf_nan=False)
    sample_interval_seconds: float = Field(default=2.0, gt=0, le=60, allow_inf_nan=False)
    max_retries: int = Field(default=4, ge=1, le=10)
    request_timeout_seconds: float = Field(default=10, gt=0, le=120)
    allow_mock: bool = False

    @field_validator("backend_api_url")
    @classmethod
    def normalize_api_url(cls, value: HttpUrl) -> HttpUrl:
        return HttpUrl(str(value).rstrip("/"))

    @model_validator(mode="after")
    def validate_detector(self):
        if self.detector_backend == "onnx" and not self.onnx_model_path:
            raise ValueError("onnx 推理需要 AI_ONNX_MODEL_PATH")
        if self.detector_backend == "mock" and not self.allow_mock:
            raise ValueError("mock 仅供测试；需要同时设置 AI_ALLOW_MOCK=true")
        return self

    @property
    def capture_source(self) -> int | str:
        return int(self.video_source) if self.video_source.isdecimal() else self.video_source
