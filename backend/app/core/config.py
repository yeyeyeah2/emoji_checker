from functools import lru_cache

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    jwt_secret_key: str = Field(min_length=32)
    jwt_expire_minutes: int = Field(default=30, ge=1, le=1440)
    admin_invite_code: str = ""
    ai_api_token: str = Field(min_length=32)
    ai_min_confidence: float = Field(default=0.60, ge=0, le=1, allow_inf_nan=False)
    cors_origins: str = ""
    api_docs_enabled: bool = True
    dashboard_poll_seconds: int = Field(default=5, ge=1, le=60)

    @field_validator("admin_invite_code")
    @classmethod
    def strong_admin_invite(cls, value: str) -> str:
        if value and len(value) < 16:
            raise ValueError("ADMIN_INVITE_CODE 配置后至少需要 16 个字符")
        return value

    @field_validator("database_url")
    @classmethod
    def postgres_only(cls, value: str) -> str:
        if not value.startswith("postgresql+psycopg://"):
            raise ValueError("DATABASE_URL 必须使用 postgresql+psycopg 驱动")
        return value

    @model_validator(mode="after")
    def distinct_secrets(self):
        values = [v for v in (self.jwt_secret_key, self.admin_invite_code, self.ai_api_token) if v]
        if any(v.startswith("replace-") for v in values):
            raise ValueError("请替换示例密钥后启动")
        if len(values) != len(set(values)):
            raise ValueError("JWT、管理员邀请码及 AI 令牌必须各不相同")
        return self

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
