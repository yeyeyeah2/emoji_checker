from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError
from starlette.websockets import WebSocketDisconnect

from app.core.security import create_access_token
from app.models import EmojiRecord, EmojiType, RecordSource, SessionStatus, UserRole
from conftest import bearer

AI_HEADERS = {"Authorization": "Bearer test-ai-token-for-local-integration-tests-only"}


def credentials(user):
    token, _ = create_access_token(str(user.id), user.auth_version, user.role.value)
    return bearer(token)


def test_student_course_access_follows_schedule_and_history_remains(client, make_user, make_session, schedule_student):
    student = make_user()
    session = make_session()
    admin = make_user(UserRole.ADMIN)
    headers = credentials(student)
    body = {"session_id": str(session.id), "emoji_type": "HAPPY"}
    assert client.get("/api/v1/courses", headers=headers).json()["meta"]["total"] == 0
    assert client.post("/api/v1/emoji", headers=headers, json=body).status_code == 403
    schedule_student(session, student, admin)
    assert client.get("/api/v1/courses", headers=headers).json()["meta"]["total"] == 1
    assert client.post("/api/v1/emoji", headers=headers, json=body).status_code == 201
    response = client.put(f"/api/v1/admin/sessions/{session.id}/schedule",
                          headers=credentials(admin), json={"user_ids": []})
    assert response.status_code == 200
    assert client.get("/api/v1/sessions", headers=headers).json()["meta"]["total"] == 0
    assert client.get("/api/v1/emoji/history", headers=headers).json()["meta"]["total"] == 1
    assert client.post("/api/v1/emoji", headers=headers, json=body).status_code == 403


@pytest.mark.parametrize("state", ["past", "future", "cancelled", "inactive_course"])
def test_manual_requires_current_active_class(client, db, make_session, schedule_student, state):
    now = datetime.now(timezone.utc)
    if state == "past":
        session = make_session(starts_at=now - timedelta(hours=2), ends_at=now - timedelta(hours=1))
    elif state == "future":
        session = make_session(starts_at=now + timedelta(hours=1), ends_at=now + timedelta(hours=2))
    else:
        session = make_session()
        if state == "cancelled":
            session.status = SessionStatus.CANCELLED
        else:
            from app.models import Course
            db.get(Course, session.course_id).is_active = False
        db.commit()
    student = schedule_student(session)
    response = client.post("/api/v1/emoji", headers=credentials(student),
                           json={"session_id": str(session.id), "emoji_type": "HAPPY"})
    assert response.status_code == 409
    assert response.json()["error"]["code"] == "session_not_active"
    assert db.scalar(select(func.count()).select_from(EmojiRecord)) == 0


def test_ai_late_submission_time_range_and_no_media(client, make_session):
    now = datetime.now(timezone.utc)
    session = make_session(starts_at=now - timedelta(hours=2), ends_at=now - timedelta(hours=1))
    body = {"event_id": str(uuid4()), "session_id": str(session.id), "event_at": session.starts_at.isoformat(),
            "emoji_type": "NEUTRAL", "confidence": 0.60, "source_id": "camera-01"}
    response = client.post("/api/v1/ai/emoji-results", headers=AI_HEADERS, json=body)
    assert response.status_code == 201, response.text
    assert response.json()["data"]["user_id"] is None
    end_event = {**body, "event_id": str(uuid4()), "event_at": session.ends_at.isoformat()}
    assert client.post("/api/v1/ai/emoji-results", headers=AI_HEADERS, json=end_event).status_code == 409
    with_media = {**body, "event_id": str(uuid4()), "image": "不应接收的媒体字段"}
    assert client.post("/api/v1/ai/emoji-results", headers=AI_HEADERS, json=with_media).status_code == 422
    future = make_session(starts_at=now, ends_at=now + timedelta(hours=1))
    future_event = {**body, "event_id": str(uuid4()), "session_id": str(future.id),
                    "event_at": (now + timedelta(minutes=10)).isoformat()}
    assert client.post("/api/v1/ai/emoji-results", headers=AI_HEADERS, json=future_event).status_code == 422


def test_user_normalization_conflict_and_no_validation_secret_echo(client):
    body = {"username": "Test.User", "email": "TEST@example.edu", "password": "password-for-tests-123"}
    registered = client.post("/api/v1/auth/register", json=body)
    assert registered.status_code == 201
    assert registered.json()["data"]["user"]["username"] == "test.user"
    assert "password_hash" not in registered.text
    assert client.post("/api/v1/auth/register", json={**body, "email": "other@example.edu"}).status_code == 409
    login = client.post("/api/v1/auth/login", json={"identifier": "TEST.USER", "password": body["password"]})
    assert login.status_code == 200
    weak = client.post("/api/v1/auth/register", json={**body, "password": "secret!"})
    assert weak.status_code == 422
    assert "secret!" not in weak.text
    assert client.post("/api/v1/auth/login", json={"identifier": "' OR 1=1 --", "password": body["password"]}).status_code == 401


def test_half_open_time_filter_and_manual_ai_totals(client, make_user, make_session, schedule_student):
    session = make_session()
    student = schedule_student(session)
    manual = client.post("/api/v1/emoji", headers=credentials(student),
                         json={"session_id": str(session.id), "emoji_type": "HAPPY"}).json()["data"]
    event_time = manual["event_at"]
    ai_body = {"event_id": str(uuid4()), "session_id": str(session.id), "event_at": event_time,
               "emoji_type": "SAD", "confidence": 0.99}
    assert client.post("/api/v1/ai/emoji-results", headers=AI_HEADERS, json=ai_body).status_code == 201
    admin_headers = credentials(make_user(UserRole.ADMIN))
    assert client.get("/api/v1/admin/emoji", headers=admin_headers, params={"from": event_time}).json()["meta"]["total"] == 2
    assert client.get("/api/v1/admin/emoji", headers=admin_headers, params={"to": event_time}).json()["meta"]["total"] == 0
    totals = client.get("/api/v1/admin/statistics", headers=admin_headers, params={"group_by": ""}).json()["data"]
    assert (totals["total_records"], totals["manual_records"], totals["ai_records"], totals["student_count"]) == (2, 1, 1, 1)
    empty = client.get("/api/v1/admin/statistics", headers=admin_headers, params={"session_id": str(uuid4())}).json()["data"]
    assert empty["total_records"] == 0
    assert empty["groups"] == []


def test_disabled_user_token_is_revoked_even_after_reenable(client, make_user):
    student, admin = make_user(), make_user(UserRole.ADMIN)
    student_headers = credentials(student)
    admin_headers = credentials(admin)
    for status in ["DISABLED", "ACTIVE"]:
        patched = client.patch(f"/api/v1/admin/users/{student.id}", headers=admin_headers, json={"status": status})
        assert patched.status_code == 200
        assert client.get("/api/v1/users/me", headers=student_headers).status_code == 401
    assert client.post("/api/v1/auth/login", json={"identifier": student.username, "password": "test-password-123"}).status_code == 200


def test_dashboard_revokes_live_socket_and_blocks_other_teacher(client, make_user, make_course, make_session):
    teacher, other_teacher = make_user(UserRole.TEACHER), make_user(UserRole.TEACHER)
    session = make_session(make_course(teacher))
    with pytest.raises(WebSocketDisconnect) as denied:
        with client.websocket_connect(f"/api/v1/ws/dashboard?session_id={session.id}", headers=credentials(other_teacher)):
            pass
    assert denied.value.code == 4403
    with client.websocket_connect(f"/api/v1/ws/dashboard?session_id={session.id}", headers=credentials(teacher)) as websocket:
        assert websocket.receive_json()["type"] == "dashboard.snapshot"
        result = client.put("/api/v1/auth/password", headers=credentials(teacher),
                            json={"current_password": "test-password-123", "new_password": "new-password-for-tests-456"})
        assert result.status_code == 200
        with pytest.raises(WebSocketDisconnect) as revoked:
            websocket.receive_json()
        assert revoked.value.code == 4401


def test_invalid_schedule_and_session_edits_preserve_existing_data(client, make_user, make_session, schedule_student):
    session = make_session()
    admin = make_user(UserRole.ADMIN)
    student = schedule_student(session, admin=admin)
    headers = credentials(admin)
    assert client.post("/api/v1/emoji", headers=credentials(student),
                       json={"session_id": str(session.id), "emoji_type": "HAPPY"}).status_code == 201
    duplicate = client.put(f"/api/v1/admin/sessions/{session.id}/schedule", headers=headers,
                           json={"user_ids": [str(student.id), str(student.id)]})
    assert duplicate.status_code == 422
    invalid_time = client.patch(f"/api/v1/admin/sessions/{session.id}", headers=headers,
                               json={"starts_at": session.ends_at.isoformat()})
    assert invalid_time.status_code == 422
    excluded_record = client.patch(f"/api/v1/admin/sessions/{session.id}", headers=headers,
                                  json={"ends_at": session.starts_at.isoformat(), "starts_at": (session.starts_at - timedelta(minutes=1)).isoformat()})
    assert excluded_record.status_code == 409
    assert client.get(f"/api/v1/sessions/{session.id}/schedule", headers=headers).json()["data"] == [{"id": str(student.id), "username": student.username}]


def test_postgresql_enforces_source_fields(db, make_session, make_user):
    session = make_session()
    student = make_user()
    invalid = EmojiRecord(session_id=session.id, user_id=student.id, source=RecordSource.AI,
                          emoji_type=EmojiType.HAPPY, event_at=datetime.now(timezone.utc),
                          event_id=uuid4(), confidence=0.9)
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.add(invalid)
            db.flush()
    assert db.scalar(select(func.count()).select_from(EmojiRecord)) == 0


def test_alembic_roundtrip_and_model_match(database_engine):
    backend = Path(__file__).resolve().parents[2]
    config = Config(str(backend / "alembic.ini"))
    config.set_main_option("script_location", str(backend / "alembic"))
    with database_engine.begin() as connection:
        config.attributes["connection"] = connection
        command.downgrade(config, "base")
        assert connection.scalar(text("SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname=current_schema() AND t.typname='user_role'")) == 0
        command.upgrade(config, "head")
        command.check(config)
