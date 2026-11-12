import hmac
from uuid import UUID

import jwt

from app.core.config import get_settings
from app.core.errors import AppError
from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.models import User, UserRole, UserStatus
from app.repositories import users
from app.repositories.common import save

DUMMY_HASH = hash_password("placeholder-only-for-login-timing")


def authenticate(db, token):
    if not token:
        raise AppError(401, "authentication_required", "需要登录")
    try:
        claims = decode_access_token(token)
        user_id = UUID(claims["sub"])
        version = claims["ver"]
        if not isinstance(version, int):
            raise ValueError()
    except (jwt.InvalidTokenError, ValueError, KeyError, TypeError):
        raise AppError(401, "invalid_credentials", "登录凭证无效或已过期") from None
    user = users.get(db, user_id)
    if user is None or user.status != UserStatus.ACTIVE or user.auth_version != version:
        raise AppError(401, "invalid_credentials", "登录凭证无效或已过期")
    return user


def result(user):
    token, expires_in = create_access_token(str(user.id), user.auth_version, user.role.value)
    return {"data": {"access_token": token, "token_type": "bearer", "expires_in": expires_in, "user": user}}


def register(db, body):
    if body.role == UserRole.ADMIN:
        configured = get_settings().admin_invite_code
        if not configured:
            raise AppError(503, "service_not_configured", "管理员注册暂不可用")
        if not body.invite_code or not hmac.compare_digest(body.invite_code.encode(), configured.encode()):
            raise AppError(403, "forbidden", "管理员邀请码无效")
    user = User(username=body.username.lower(), email=str(body.email).lower(),
                password_hash=hash_password(body.password), role=body.role)
    return result(save(db, user))


def login(db, body):
    user = users.by_identifier(db, body.identifier.strip().lower())
    valid = verify_password(body.password, user.password_hash if user else DUMMY_HASH)
    if not valid or user is None or user.status != UserStatus.ACTIVE:
        raise AppError(401, "invalid_credentials", "用户名/邮箱或密码错误")
    return result(user)


def change_password(db, user, body):
    user = users.get(db, user.id, lock=True)
    if not verify_password(body.current_password, user.password_hash):
        raise AppError(400, "invalid_credentials", "当前密码错误")
    if body.current_password == body.new_password:
        raise AppError(422, "validation_error", "新密码不能与当前密码相同")
    user.password_hash = hash_password(body.new_password)
    user.auth_version += 1
    save(db, user)
    return {"data": {"updated": True}}
