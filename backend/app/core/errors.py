import logging

from fastapi import Request
from fastapi.exceptions import RequestValidationError, WebSocketRequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError, OperationalError
from starlette.exceptions import HTTPException

logger = logging.getLogger(__name__)


class AppError(Exception):
    def __init__(self, status_code: int, code: str, message: str, details=None):
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details


def error_response(status_code, code, message, details=None):
    headers = {"WWW-Authenticate": "Bearer"} if status_code == 401 else None
    return JSONResponse(status_code=status_code, content={"error": {"code": code, "message": message, "details": details}}, headers=headers)


def install_error_handlers(app):
    @app.exception_handler(AppError)
    async def app_error(request: Request, exc: AppError):
        return error_response(exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        # 不返回原始输入，避免校验错误回显密码或服务令牌。
        details = [{"location": list(e["loc"]), "type": e["type"]} for e in exc.errors()]
        return error_response(422, "validation_error", "请求参数校验失败", details)

    @app.exception_handler(WebSocketRequestValidationError)
    async def websocket_validation(websocket, exc):
        await websocket.close(code=4400, reason="请求参数无效")

    @app.exception_handler(HTTPException)
    async def http_error(request: Request, exc: HTTPException):
        code = {401: "authentication_required", 403: "forbidden", 404: "not_found"}.get(exc.status_code, "request_error")
        return error_response(exc.status_code, code, "请求失败")

    @app.exception_handler(IntegrityError)
    async def integrity_error(request: Request, exc: IntegrityError):
        return error_response(409, "conflict", "数据与现有记录或约束冲突")

    @app.exception_handler(OperationalError)
    async def database_error(request: Request, exc: OperationalError):
        return error_response(503, "service_unavailable", "数据库暂不可用")

    @app.exception_handler(Exception)
    async def internal_error(request: Request, exc: Exception):
        logger.error("请求处理失败：%s %s（%s）", request.method, request.url.path, type(exc).__name__)
        return error_response(500, "internal_error", "服务内部错误")
