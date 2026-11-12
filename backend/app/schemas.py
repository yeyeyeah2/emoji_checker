from datetime import datetime, timezone
from typing import Annotated, Generic, Literal, TypeVar
from uuid import UUID

from pydantic import (AfterValidator, AwareDatetime, BaseModel, ConfigDict, EmailStr,
                      Field, StringConstraints, field_validator, model_validator)

from app.models import EmojiType, RecordSource, SessionStatus, UserRole, UserStatus

UTCDateTime = Annotated[AwareDatetime, AfterValidator(lambda v: v.astimezone(timezone.utc))]
Username = Annotated[str, StringConstraints(min_length=3, max_length=64, pattern=r"^[A-Za-z0-9_.-]+$")]
CourseCode = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64, pattern=r"^[A-Za-z0-9_.-]+$")]
Name = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=160)]
ClassName = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=120)]
Password = Annotated[str, StringConstraints(min_length=12, max_length=128)]


class InputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class PatchModel(InputModel):
    @model_validator(mode="after")
    def nonempty_nonnull(self):
        if not self.model_fields_set or any(getattr(self, name) is None for name in self.model_fields_set):
            raise ValueError("至少提供一个修改字段，且不能为 null")
        return self


class RegisterInput(InputModel):
    username: Username
    email: EmailStr
    password: Password
    role: UserRole = UserRole.STUDENT
    invite_code: str | None = Field(default=None, max_length=256)


class LoginInput(InputModel):
    identifier: str = Field(min_length=1, max_length=320)
    password: str = Field(min_length=1, max_length=128)


class PasswordInput(InputModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: Password


class ProfileInput(PatchModel):
    username: Username | None = None
    email: EmailStr | None = None


class UserAdminInput(PatchModel):
    status: UserStatus | None = None
    role: UserRole | None = None


class CourseInput(InputModel):
    code: CourseCode
    name: Name
    teacher_id: UUID
    is_active: bool = True


class CoursePatch(PatchModel):
    code: CourseCode | None = None
    name: Name | None = None
    teacher_id: UUID | None = None
    is_active: bool | None = None


class SessionInput(InputModel):
    course_id: UUID
    class_name: ClassName
    starts_at: UTCDateTime
    ends_at: UTCDateTime
    status: SessionStatus = SessionStatus.SCHEDULED

    @model_validator(mode="after")
    def time_order(self):
        if self.starts_at >= self.ends_at:
            raise ValueError("starts_at 必须早于 ends_at")
        return self


class SessionPatch(PatchModel):
    class_name: ClassName | None = None
    starts_at: UTCDateTime | None = None
    ends_at: UTCDateTime | None = None
    status: SessionStatus | None = None


class ScheduleInput(InputModel):
    user_ids: list[UUID] = Field(max_length=1000)

    @field_validator("user_ids")
    @classmethod
    def unique_user_ids(cls, value):
        if len(value) != len(set(value)):
            raise ValueError("user_ids 不能重复")
        return value


class EmojiInput(InputModel):
    session_id: UUID
    emoji_type: EmojiType


class AIEmojiInput(InputModel):
    event_id: UUID
    session_id: UUID
    event_at: UTCDateTime
    emoji_type: EmojiType
    confidence: float = Field(ge=0, le=1, allow_inf_nan=False)
    source_id: str | None = Field(default=None, min_length=1, max_length=120)


class OutputModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserOut(OutputModel):
    id: UUID
    username: str
    email: EmailStr
    role: UserRole
    status: UserStatus
    created_at: UTCDateTime


class RosterStudent(BaseModel):
    id: UUID
    username: str


class AuthData(BaseModel):
    access_token: str
    token_type: Literal["bearer"] = "bearer"
    expires_in: int
    user: UserOut


class CourseOut(OutputModel):
    id: UUID
    code: str
    name: str
    teacher_id: UUID
    is_active: bool
    created_at: UTCDateTime


class SessionOut(OutputModel):
    id: UUID
    course_id: UUID
    class_name: str
    starts_at: UTCDateTime
    ends_at: UTCDateTime
    status: SessionStatus
    created_at: UTCDateTime


class EmojiOut(OutputModel):
    id: UUID
    session_id: UUID
    user_id: UUID | None
    emoji_type: EmojiType
    source: RecordSource
    event_at: UTCDateTime
    received_at: UTCDateTime
    confidence: float | None
    event_id: UUID | None
    source_id: str | None


T = TypeVar("T")


class DataEnvelope(BaseModel, Generic[T]):
    data: T


class PageMeta(BaseModel):
    limit: int
    offset: int
    total: int


class PageEnvelope(BaseModel, Generic[T]):
    data: list[T]
    meta: PageMeta


class AuthOut(DataEnvelope[AuthData]):
    pass


class UpdateOut(BaseModel):
    updated: bool


class ScheduleOut(BaseModel):
    session_id: UUID
    user_ids: list[UUID]


class AIReplayMeta(BaseModel):
    idempotent_replay: bool


class AIResultOut(DataEnvelope[EmojiOut]):
    meta: AIReplayMeta


class StatisticsGroup(BaseModel):
    course: str | None = None
    class_: str | None = Field(default=None, alias="class")
    session: UUID | None = None
    emoji_type: EmojiType | None = None
    source: RecordSource | None = None
    period: UTCDateTime | None = None
    record_count: int
    percentage: float
    manual_count: int
    ai_count: int
    student_count: int


class StatisticsOut(BaseModel):
    total_records: int
    manual_records: int
    ai_records: int
    student_count: int
    groups: list[StatisticsGroup]


class DashboardCounts(BaseModel):
    manual: dict[EmojiType, int]
    ai: dict[EmojiType, int]


class TrendPoint(BaseModel):
    minute: UTCDateTime
    emoji_type: EmojiType
    source: RecordSource
    count: int


class DashboardOut(BaseModel):
    session_id: UUID
    generated_at: UTCDateTime
    window_minutes: int
    counts: DashboardCounts
    trend: list[TrendPoint]


class DashboardMessage(BaseModel):
    type: Literal["dashboard.snapshot"] = "dashboard.snapshot"
    generated_at: UTCDateTime
    data: DashboardOut


class HealthOut(BaseModel):
    status: Literal["ok"] = "ok"
    database: Literal["ok"] | None = None


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: list[dict] | None = None


class ErrorEnvelope(BaseModel):
    error: ErrorDetail
