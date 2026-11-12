from datetime import datetime
from enum import Enum
import uuid

from sqlalchemy import Boolean, CheckConstraint, DateTime, Enum as SAEnum, ForeignKey, Index, String, UniqueConstraint, Uuid, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def enum_type(enum_class: type[Enum], name: str) -> SAEnum:
    return SAEnum(enum_class, name=name, values_callable=lambda members: [member.value for member in members], validate_strings=True, create_constraint=True)


class UserRole(str, Enum):
    STUDENT = "STUDENT"
    TEACHER = "TEACHER"
    ADMIN = "ADMIN"


class UserStatus(str, Enum):
    ACTIVE = "ACTIVE"
    DISABLED = "DISABLED"


class SessionStatus(str, Enum):
    SCHEDULED = "SCHEDULED"
    CANCELLED = "CANCELLED"


class EmojiType(str, Enum):
    HAPPY = "HAPPY"
    SAD = "SAD"
    ANGRY = "ANGRY"
    FEARFUL = "FEARFUL"
    SURPRISED = "SURPRISED"
    NEUTRAL = "NEUTRAL"


class RecordSource(str, Enum):
    MANUAL = "MANUAL"
    AI = "AI"


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("length(username) BETWEEN 3 AND 64", name="username_length"),
        CheckConstraint("length(password_hash) > 0", name="password_hash_nonempty"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(320), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(enum_type(UserRole, "user_role"), nullable=False, default=UserRole.STUDENT)
    status: Mapped[UserStatus] = mapped_column(enum_type(UserStatus, "user_status"), nullable=False, default=UserStatus.ACTIVE)
    auth_version: Mapped[int] = mapped_column(nullable=False, default=0, server_default="0")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class Course(Base):
    __tablename__ = "courses"
    __table_args__ = (CheckConstraint("length(name) BETWEEN 1 AND 160", name="name_length"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    name: Mapped[str] = mapped_column(String(160), nullable=False)
    teacher_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ClassSession(Base):
    __tablename__ = "class_sessions"
    __table_args__ = (
        CheckConstraint("starts_at < ends_at", name="valid_time_range"),
        CheckConstraint("length(class_name) BETWEEN 1 AND 120", name="class_name_length"),
        Index("ix_class_sessions_course_starts", "course_id", "starts_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("courses.id", ondelete="RESTRICT"), nullable=False)
    class_name: Mapped[str] = mapped_column(String(120), nullable=False)
    starts_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ends_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[SessionStatus] = mapped_column(enum_type(SessionStatus, "session_status"), nullable=False, default=SessionStatus.SCHEDULED)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ScheduleUser(Base):
    __tablename__ = "schedule_users"
    __table_args__ = (UniqueConstraint("session_id", "user_id", name="session_user"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("class_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    user_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True)
    assigned_by: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    assigned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())


class EmojiRecord(Base):
    __tablename__ = "emoji_records"
    __table_args__ = (
        CheckConstraint("confidence IS NULL OR (confidence >= 0 AND confidence <= 1)", name="confidence_range"),
        CheckConstraint(
            "(source = 'MANUAL' AND user_id IS NOT NULL AND confidence IS NULL AND event_id IS NULL) "
            "OR (source = 'AI' AND user_id IS NULL AND confidence IS NOT NULL AND event_id IS NOT NULL)",
            name="source_fields",
        ),
        Index("ix_emoji_records_session_event", "session_id", "event_at"),
        Index("ix_emoji_records_user_event", "user_id", "event_at"),
        Index("ix_emoji_records_source_event", "source", "event_at"),
    )

    id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(Uuid(as_uuid=True), ForeignKey("class_sessions.id", ondelete="RESTRICT"), nullable=False)
    user_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True)
    emoji_type: Mapped[EmojiType] = mapped_column(enum_type(EmojiType, "emoji_type"), nullable=False)
    source: Mapped[RecordSource] = mapped_column(enum_type(RecordSource, "record_source"), nullable=False)
    event_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    confidence: Mapped[float | None] = mapped_column(nullable=True)
    event_id: Mapped[uuid.UUID | None] = mapped_column(Uuid(as_uuid=True), unique=True, nullable=True)
    source_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
