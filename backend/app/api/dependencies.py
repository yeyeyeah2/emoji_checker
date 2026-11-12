from typing import Annotated
from uuid import UUID

from fastapi import Depends, Query
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.errors import AppError
from app.core.security import verify_ai_token
from app.db.session import get_db
from app.models import EmojiType, RecordSource, User, UserRole
from app.schemas import UTCDateTime
from app.services.auth import authenticate

bearer = HTTPBearer(auto_error=False, scheme_name="UserJWT", description="用户登录返回的 JWT")
ai_bearer = HTTPBearer(auto_error=False, scheme_name="AIServiceToken", description="独立 AI 服务令牌")
Db = Annotated[Session, Depends(get_db)]


def current_user(db: Db, credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
    return authenticate(db, credentials.credentials if credentials else None)


def require_roles(*roles):
    def dependency(user: Annotated[User, Depends(current_user)]):
        if user.role not in roles:
            raise AppError(403, "forbidden", "没有访问权限")
        return user
    return dependency


def ai_service(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(ai_bearer)]):
    if not verify_ai_token(credentials.credentials if credentials else None):
        raise AppError(401, "authentication_required", "AI 服务凭证无效")


CurrentUser = Annotated[User, Depends(current_user)]
Admin = Annotated[User, Depends(require_roles(UserRole.ADMIN))]
Staff = Annotated[User, Depends(require_roles(UserRole.TEACHER, UserRole.ADMIN))]
Student = Annotated[User, Depends(require_roles(UserRole.STUDENT))]


def record_filters(
    session_id: UUID | None = None, course_id: UUID | None = None, user_id: UUID | None = None,
    emoji_type: EmojiType | None = None, source: RecordSource | None = None,
    from_: UTCDateTime | None = Query(None, alias="from"), to: UTCDateTime | None = None,
    class_name: str | None = Query(None, alias="class", min_length=1, max_length=120),
):
    return {"session_id": session_id, "course_id": course_id, "user_id": user_id,
            "emoji_type": emoji_type, "source": source, "from_": from_, "to": to, "class_name": class_name}


Filters = Annotated[dict, Depends(record_filters)]
