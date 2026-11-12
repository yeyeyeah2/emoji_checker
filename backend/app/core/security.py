from datetime import datetime, timedelta, timezone
import hmac

import jwt
from pwdlib import PasswordHash

from app.core.config import get_settings

_password_hash = PasswordHash.recommended()
ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return _password_hash.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return _password_hash.verify(password, password_hash)
    except Exception:
        return False


def create_access_token(user_id: str, auth_version: int, role: str) -> tuple[str, int]:
    settings = get_settings()
    expires_in = settings.jwt_expire_minutes * 60
    now = datetime.now(timezone.utc)
    token = jwt.encode(
        {"sub": user_id, "ver": auth_version, "role": role, "iat": now, "exp": now + timedelta(seconds=expires_in)},
        settings.jwt_secret_key,
        algorithm=ALGORITHM,
    )
    return token, expires_in


def decode_access_token(token: str) -> dict:
    return jwt.decode(token, get_settings().jwt_secret_key, algorithms=[ALGORITHM], options={"require": ["sub", "iat", "exp", "ver"]})


def verify_ai_token(candidate: str | None) -> bool:
    configured = get_settings().ai_api_token
    return bool(configured and candidate and hmac.compare_digest(candidate.encode(), configured.encode()))
