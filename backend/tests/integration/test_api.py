from datetime import datetime, timedelta, timezone
from uuid import uuid4

import pytest
from starlette.websockets import WebSocketDisconnect

from app.core.security import create_access_token
from app.models import EmojiRecord, EmojiType, RecordSource, UserRole
from conftest import bearer


def register(client, username, role="STUDENT", invite_code=None):
    body = {"username": username, "email": f"{username}@example.edu", "password": "valid-password-123", "role": role}
    if invite_code:
        body["invite_code"] = invite_code
    return client.post("/api/v1/auth/register", json=body)


def test_registration_login_password_change_and_admin_invite(client):
    denied_admin = register(client, "adminDenied", role="ADMIN")
    assert denied_admin.status_code == 403
    registered = register(client, "studentOne")
    assert registered.status_code == 201
    data = registered.json()["data"]
    assert data["user"]["role"] == "STUDENT"
    token = data["access_token"]
    response = client.put("/api/v1/auth/password", headers=bearer(token), json={"current_password": "valid-password-123", "new_password": "another-password-456"})
    assert response.status_code == 200
    assert client.get("/api/v1/users/me", headers=bearer(token)).status_code == 401
    assert client.post("/api/v1/auth/login", json={"identifier": "studentone", "password": "another-password-456"}).status_code == 200
    admin = register(client, "adminAllowed", role="ADMIN", invite_code="test-admin-invite-long-code")
    assert admin.status_code == 201


def test_admin_only_routes_and_teacher_course_scope(client, make_user, make_course, make_session, schedule_student):
    teacher = make_user(UserRole.TEACHER)
    other_teacher = make_user(UserRole.TEACHER)
    course = make_course(teacher)
    own_session = make_session(course)
    other_course = make_course(other_teacher)
    other_session = make_session(other_course)
    student = schedule_student(own_session)
    teacher_token, _ = create_access_token(str(teacher.id), teacher.auth_version, teacher.role.value)
    student_token, _ = create_access_token(str(student.id), student.auth_version, student.role.value)
    assert client.get("/api/v1/admin/users", headers=bearer(student_token)).status_code == 403
    own = client.get("/api/v1/sessions", headers=bearer(teacher_token)).json()["data"]
    assert [row["id"] for row in own] == [str(own_session.id)]
    assert client.get(f"/api/v1/dashboard/realtime?session_id={other_session.id}", headers=bearer(teacher_token)).status_code == 403


def test_manual_ai_history_statistics_and_csv(client, make_user, make_course, make_session, schedule_student):
    teacher = make_user(UserRole.TEACHER)
    admin = make_user(UserRole.ADMIN)
    course = make_course(teacher, name="=cmd")
    session = make_session(course)
    student = schedule_student(session, admin=admin)
    student_token, _ = create_access_token(str(student.id), student.auth_version, student.role.value)
    teacher_token, _ = create_access_token(str(teacher.id), teacher.auth_version, teacher.role.value)
    admin_token, _ = create_access_token(str(admin.id), admin.auth_version, admin.role.value)

    manual = client.post("/api/v1/emoji", headers=bearer(student_token), json={"session_id": str(session.id), "emoji_type": "HAPPY"})
    assert manual.status_code == 201, manual.text
    ai_body = {"event_id": str(uuid4()), "session_id": str(session.id), "event_at": datetime.now(timezone.utc).isoformat(), "emoji_type": "SAD", "confidence": 0.9}
    ai = client.post("/api/v1/ai/emoji-results", headers={"Authorization": "Bearer test-ai-token-for-local-integration-tests-only"}, json=ai_body)
    assert ai.status_code == 201, ai.text
    replay = client.post("/api/v1/ai/emoji-results", headers={"Authorization": "Bearer test-ai-token-for-local-integration-tests-only"}, json=ai_body)
    assert replay.status_code == 200
    assert replay.json()["meta"]["idempotent_replay"] is True
    changed_payload = {**ai_body, "emoji_type": "HAPPY"}
    conflict = client.post("/api/v1/ai/emoji-results", headers={"Authorization": "Bearer test-ai-token-for-local-integration-tests-only"}, json=changed_payload)
    assert conflict.status_code == 409
    assert client.post("/api/v1/ai/emoji-results", headers=bearer(student_token), json=ai_body).status_code == 401
    history = client.get("/api/v1/emoji/history", headers=bearer(teacher_token)).json()
    assert history["meta"]["total"] == 2
    stats = client.get("/api/v1/statistics", headers=bearer(teacher_token))
    assert stats.status_code == 200, stats.text
    assert stats.json()["data"]["total_records"] == 2
    export = client.get("/api/v1/admin/emoji/export?format=csv", headers=bearer(admin_token))
    assert export.status_code == 200
    assert export.text.startswith("\ufeff")
    assert "'=cmd" in export.text
    assert client.get("/api/v1/admin/statistics?group_by=source&bucket=minute", headers=bearer(admin_token)).status_code == 422


def test_ai_threshold_and_invalid_session_time(client, make_session):
    session = make_session()
    body = {"event_id": str(uuid4()), "session_id": str(session.id), "event_at": datetime.now(timezone.utc).isoformat(), "emoji_type": "NEUTRAL", "confidence": 0.2}
    result = client.post("/api/v1/ai/emoji-results", headers={"Authorization": "Bearer test-ai-token-for-local-integration-tests-only"}, json=body)
    assert result.status_code == 422
    assert result.json()["error"]["code"] == "confidence_below_threshold"


def test_dashboard_snapshot_and_health(client, make_user, make_course, make_session):
    teacher = make_user(UserRole.TEACHER)
    session = make_session(make_course(teacher))
    token, _ = create_access_token(str(teacher.id), teacher.auth_version, teacher.role.value)
    response = client.get(f"/api/v1/dashboard/realtime?session_id={session.id}", headers=bearer(token))
    assert response.status_code == 200, response.text
    assert response.json()["data"]["window_minutes"] == 30
    assert client.get("/api/v1/health/live").json()["data"]["status"] == "ok"


def test_course_session_and_schedule_management(client, make_user):
    admin = make_user(UserRole.ADMIN)
    teacher = make_user(UserRole.TEACHER)
    student = make_user()
    admin_token, _ = create_access_token(str(admin.id), admin.auth_version, admin.role.value)
    admin_headers = bearer(admin_token)
    course_response = client.post("/api/v1/admin/courses", headers=admin_headers,
        json={"code": "MATH-01", "name": "课程一", "teacher_id": str(teacher.id)})
    assert course_response.status_code == 201, course_response.text
    course_id = course_response.json()["data"]["id"]
    starts = (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat()
    ends = (datetime.now(timezone.utc) + timedelta(hours=2)).isoformat()
    session_response = client.post("/api/v1/admin/sessions", headers=admin_headers,
        json={"course_id": course_id, "class_name": "软工一班", "starts_at": starts, "ends_at": ends})
    assert session_response.status_code == 201, session_response.text
    session_id = session_response.json()["data"]["id"]
    schedule_response = client.put(f"/api/v1/admin/sessions/{session_id}/schedule", headers=admin_headers,
        json={"user_ids": [str(student.id)]})
    assert schedule_response.status_code == 200, schedule_response.text
    invalid = client.put(f"/api/v1/admin/sessions/{session_id}/schedule", headers=admin_headers,
        json={"user_ids": [str(teacher.id)]})
    assert invalid.status_code == 422
    roster_token, _ = create_access_token(str(teacher.id), teacher.auth_version, teacher.role.value)
    roster = client.get(f"/api/v1/sessions/{session_id}/schedule", headers=bearer(roster_token))
    assert [row["id"] for row in roster.json()["data"]] == [str(student.id)]
    assert "email" not in roster.json()["data"][0]


def test_history_self_access_and_filter_validation(client, make_user, make_course, make_session, schedule_student):
    teacher = make_user(UserRole.TEACHER)
    session = make_session(make_course(teacher))
    student = schedule_student(session)
    token, _ = create_access_token(str(student.id), student.auth_version, student.role.value)
    denied = client.get(f"/api/v1/emoji/history?user_id={uuid4()}", headers=bearer(token))
    assert denied.status_code == 403
    naive = client.get("/api/v1/emoji/history?from=2026-11-12T10:00:00", headers=bearer(token))
    assert naive.status_code == 422
    reversed_range = client.get("/api/v1/emoji/history?from=2026-11-13T10:00:00Z&to=2026-11-12T10:00:00Z", headers=bearer(token))
    assert reversed_range.status_code == 422


def test_admin_analytics_course_class_and_time_buckets(client, make_user, make_course, make_session, schedule_student):
    teacher = make_user(UserRole.TEACHER)
    admin = make_user(UserRole.ADMIN)
    course = make_course(teacher)
    session = make_session(course)
    student = schedule_student(session, admin=admin)
    token, _ = create_access_token(str(student.id), student.auth_version, student.role.value)
    admin_token, _ = create_access_token(str(admin.id), admin.auth_version, admin.role.value)
    response = client.post("/api/v1/emoji", headers=bearer(token), json={"session_id": str(session.id), "emoji_type": "HAPPY"})
    assert response.status_code == 201, response.text
    stats = client.get("/api/v1/admin/statistics?group_by=course,class,session,emoji_type,source&bucket=hour", headers=bearer(admin_token))
    assert stats.status_code == 200, stats.text
    group = stats.json()["data"]["groups"][0]
    assert group["course"] == course.code
    assert group["class"] == session.class_name
    assert group["session"] == str(session.id)
    assert group["source"] == "MANUAL"
    assert group["record_count"] == 1


def test_websocket_dashboard_authentication_and_snapshot(client, make_user, make_course, make_session):
    teacher = make_user(UserRole.TEACHER)
    session = make_session(make_course(teacher))
    token, _ = create_access_token(str(teacher.id), teacher.auth_version, teacher.role.value)
    with client.websocket_connect(f"/api/v1/ws/dashboard?session_id={session.id}",
                                  headers=bearer(token), subprotocols=["bearer"]) as websocket:
        message = websocket.receive_json()
        assert message["type"] == "dashboard.snapshot"
        assert message["data"]["session_id"] == str(session.id)
    with pytest.raises(WebSocketDisconnect) as denied:
        with client.websocket_connect(f"/api/v1/ws/dashboard?session_id={session.id}"):
            pass
    assert denied.value.code == 4401


def test_admin_cannot_lock_self_or_reassign_used_role(client, make_user, make_session, make_course, schedule_student):
    admin = make_user(UserRole.ADMIN)
    teacher = make_user(UserRole.TEACHER)
    student = make_user()
    session = make_session(make_course(teacher))
    schedule_student(session, student=student, admin=admin)
    admin_token, _ = create_access_token(str(admin.id), admin.auth_version, admin.role.value)
    headers = bearer(admin_token)
    self_lock = client.patch(f"/api/v1/admin/users/{admin.id}", headers=headers, json={"status": "DISABLED"})
    assert self_lock.status_code == 409
    role_change = client.patch(f"/api/v1/admin/users/{student.id}", headers=headers, json={"role": "TEACHER"})
    assert role_change.status_code == 409


def test_websocket_subprotocol_carries_token_without_echoing_it(client, make_user, make_course, make_session):
    teacher = make_user(UserRole.TEACHER)
    session = make_session(make_course(teacher))
    token, _ = create_access_token(str(teacher.id), teacher.auth_version, teacher.role.value)
    with client.websocket_connect(f"/api/v1/ws/dashboard?session_id={session.id}", subprotocols=["bearer", token]) as websocket:
        assert websocket.accepted_subprotocol == "bearer"
        assert websocket.receive_json()["type"] == "dashboard.snapshot"
