import pytest

from app.core.security import create_access_token, decode_access_token, hash_password, verify_password
from app.services.emoji import csv_safe


def test_password_hash_is_salted_and_verifiable():
    first = hash_password("a-secure-password")
    second = hash_password("a-secure-password")
    assert first != second
    assert verify_password("a-secure-password", first)
    assert not verify_password("wrong-password", first)


def test_jwt_contains_user_and_version():
    token, expires_in = create_access_token("00000000-0000-0000-0000-000000000001", 4, "STUDENT")
    claims = decode_access_token(token)
    assert claims["ver"] == 4
    assert claims["role"] == "STUDENT"
    assert expires_in > 0


@pytest.mark.parametrize("value", ["=1+1", "+cmd", "-1+1", "@SUM(A1)", "  =1+1", "\tformula"])
def test_csv_formula_prefix_is_neutralized(value):
    assert csv_safe(value).startswith("'")


def test_csv_safe_value_is_preserved():
    assert csv_safe("HAPPY") == "HAPPY"


def test_expired_and_unsigned_jwt_are_rejected():
    from datetime import datetime, timedelta, timezone

    import jwt

    from app.core.config import get_settings

    claims = {"sub": "00000000-0000-0000-0000-000000000000", "ver": 0,
              "iat": datetime.now(timezone.utc) - timedelta(hours=2),
              "exp": datetime.now(timezone.utc) - timedelta(hours=1)}
    token = jwt.encode(claims, get_settings().jwt_secret_key, algorithm="HS256")
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_access_token(token)
    with pytest.raises(jwt.InvalidAlgorithmError):
        decode_access_token(jwt.encode(claims, "", algorithm="none"))
