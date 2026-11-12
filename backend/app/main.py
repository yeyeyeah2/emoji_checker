from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.core.errors import install_error_handlers
from app.schemas import ErrorEnvelope

settings = get_settings()
app = FastAPI(
    title="表情符号课堂情绪检查器 API", version="1.0.0",
    description="UTC 时间使用带 Z 的 ISO 8601 格式；时间筛选为左闭右开区间。",
    docs_url="/docs" if settings.api_docs_enabled else None,
    redoc_url=None,
    openapi_url="/openapi.json" if settings.api_docs_enabled else None,
    responses={code: {"model": ErrorEnvelope} for code in (400, 401, 403, 404, 409, 422, 500, 503)},
)
if settings.allowed_origins:
    app.add_middleware(CORSMiddleware, allow_origins=settings.allowed_origins,
        allow_credentials=False, allow_methods=["GET", "POST", "PUT", "PATCH", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type"], expose_headers=["Content-Disposition"])
install_error_handlers(app)
app.include_router(api_router, prefix="/api/v1")
