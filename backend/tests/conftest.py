import os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy import create_engine, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

TEST_DATABASE_URL = os.environ.get(
    "TEST_DATABASE_URL", "postgresql+psycopg://postgres:postgres@localhost:5432/emoji_checker_test"
)
if not (make_url(TEST_DATABASE_URL).database or "").endswith("_test"):
    raise RuntimeError("测试只能连接名称以 _test 结尾的专用 PostgreSQL 数据库")
os.environ.update(
    DATABASE_URL=TEST_DATABASE_URL,
    JWT_SECRET_KEY="test-jwt-secret-that-is-long-enough-32",
    ADMIN_INVITE_CODE="test-admin-invite-long-code",
    AI_API_TOKEN="test-ai-token-for-local-integration-tests-only",
    AI_MIN_CONFIDENCE="0.60",
    CORS_ORIGINS="http://localhost:5173",
    DASHBOARD_POLL_SECONDS="1",
)

from fastapi.testclient import TestClient

from app.api.v1.routers import dashboard
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models import ClassSession, Course, ScheduleUser, User, UserRole


@pytest.fixture(scope="session")
def database_engine():
    schema = "test_" + uuid4().hex
    admin_engine = create_engine(TEST_DATABASE_URL)
    with admin_engine.begin() as connection:
        connection.execute(text(f'CREATE SCHEMA "{schema}"'))
    engine = create_engine(TEST_DATABASE_URL, pool_pre_ping=True,
                          connect_args={"options": f"-c timezone=UTC -c search_path={schema}"})
    try:
        backend = Path(__file__).resolve().parents[1]
        config = Config(str(backend / "alembic.ini"))
        config.set_main_option("script_location", str(backend / "alembic"))
        with engine.begin() as connection:
            config.attributes["connection"] = connection
            command.upgrade(config, "head")
        yield engine
    finally:
        engine.dispose()
        with admin_engine.begin() as connection:
            connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
        admin_engine.dispose()


@pytest.fixture
def db(database_engine):
    session = Session(database_engine, expire_on_commit=False)
    try:
        yield session
    finally:
        session.rollback()
        for table in reversed(Base.metadata.sorted_tables):
            session.execute(table.delete())
        session.commit()
        session.close()


@pytest.fixture
def client(database_engine, monkeypatch):
    request_sessions = sessionmaker(database_engine, expire_on_commit=False, autoflush=False)

    def override_get_db():
        with request_sessions() as db:
            yield db
    app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(dashboard, "SessionLocal", sessionmaker(
        database_engine, expire_on_commit=False, autoflush=False))
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()


@pytest.fixture
def make_user(db):
    def create(role=UserRole.STUDENT, username=None, email=None, password="test-password-123"):
        suffix = str(uuid4())[:8]
        user = User(username=username or f"user_{suffix}", email=email or f"{suffix}@example.edu",
                    password_hash=hash_password(password), role=role)
        db.add(user)
        db.commit()
        db.refresh(user)
        return user
    return create


@pytest.fixture
def make_course(db, make_user):
    def create(teacher=None, name="情绪识别课程"):
        teacher = teacher or make_user(UserRole.TEACHER)
        course = Course(code=f"C-{uuid4().hex[:8]}", name=name, teacher_id=teacher.id)
        db.add(course)
        db.commit()
        db.refresh(course)
        return course
    return create


@pytest.fixture
def make_session(db, make_course):
    def create(course=None, starts_at=None, ends_at=None, class_name="软工一班"):
        now = datetime.now(timezone.utc)
        course = course or make_course()
        item = ClassSession(course_id=course.id, class_name=class_name,
                            starts_at=starts_at or now - timedelta(minutes=5),
                            ends_at=ends_at or now + timedelta(minutes=55))
        db.add(item)
        db.commit()
        db.refresh(item)
        return item
    return create


@pytest.fixture
def schedule_student(db, make_user):
    def add(session, student=None, admin=None):
        student = student or make_user()
        admin = admin or make_user(UserRole.ADMIN)
        db.add(ScheduleUser(session_id=session.id, user_id=student.id, assigned_by=admin.id))
        db.commit()
        return student
    return add


def bearer(token):
    return {"Authorization": f"Bearer {token}"}
