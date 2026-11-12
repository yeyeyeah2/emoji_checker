import csv
from datetime import datetime, timedelta, timezone
from io import StringIO

from app.core.config import get_settings
from app.core.errors import AppError
from app.models import EmojiRecord, RecordSource, SessionStatus, UserRole
from app.repositories import academics, records
from app.repositories.common import page, save
from app.services.academics import require_session
from app.services.common import validate_range


CSV_COLUMNS = ["record_id", "session_id", "course_id", "course_code", "course_name",
               "class_name", "user_id", "emoji_type", "source", "event_at", "received_at", "confidence"]


def history(db, user, filters, limit, offset):
    validate_filters(user, filters)
    query = records.scoped_query(user, filters).order_by(EmojiRecord.event_at.desc(), EmojiRecord.id)
    return page(db, query, limit, offset)


def validate_filters(user, filters):
    validate_range(filters.get("from_"), filters.get("to"))
    if user.role == UserRole.STUDENT and filters.get("user_id") not in (None, user.id):
        raise AppError(403, "forbidden", "学生不能查询其他用户记录")


def create_manual(db, user, body):
    session = require_session(db, user, body.session_id, lock=True)
    now = datetime.now(timezone.utc)
    course = academics.get_course(db, session.course_id)
    if not course.is_active or session.status != SessionStatus.SCHEDULED or not session.starts_at <= now < session.ends_at:
        raise AppError(409, "session_not_active", "课堂当前不在进行中")
    return save(db, EmojiRecord(session_id=session.id, user_id=user.id,
        emoji_type=body.emoji_type, source=RecordSource.MANUAL, event_at=now))


def replay(existing, body):
    fields = ("session_id", "event_at", "emoji_type", "confidence", "source_id")
    if any(getattr(existing, field) != getattr(body, field) for field in fields):
        raise AppError(409, "conflict", "event_id 已用于不同的 AI 事件")
    return existing, True


def create_ai(db, body):
    existing = records.by_event_id(db, body.event_id)
    if existing is not None:
        return replay(existing, body)
    if body.confidence < get_settings().ai_min_confidence:
        raise AppError(422, "confidence_below_threshold", "AI 置信度低于入库阈值")
    session = academics.get_session(db, body.session_id, lock=True)
    if session is None:
        raise AppError(404, "not_found", "课堂不存在")
    if session.status != SessionStatus.SCHEDULED or not session.starts_at <= body.event_at < session.ends_at:
        raise AppError(409, "session_not_active", "AI 事件时间不在有效课堂范围内")
    if body.event_at > datetime.now(timezone.utc) + timedelta(minutes=5):
        raise AppError(422, "validation_error", "event_at 不能超过服务器时间 5 分钟")
    record = records.insert_ai(db, {**body.model_dump(), "source": RecordSource.AI, "user_id": None})
    if record is None:
        existing = records.by_event_id(db, body.event_id)
        result = replay(existing, body)
    else:
        result = record, False
    db.commit()
    return result


def csv_safe(value):
    text = "" if value is None else str(value)
    # 防止空白、控制字符掩盖公式前缀；引号与换行交由 csv 模块转义。
    probe = text.lstrip("\ufeff \t\r\n\v\f")
    if (probe[:1] in ("=", "+", "-", "@", "＝", "＋", "－", "＠")
            or any(ord(char) < 32 for char in text)):
        return "'" + text
    return text


def csv_stream(rows):
    buffer = StringIO(newline="")
    writer = csv.writer(buffer, lineterminator="\r\n")
    writer.writerow(CSV_COLUMNS)
    yield "\ufeff" + buffer.getvalue()
    for row in rows:
        buffer.seek(0)
        buffer.truncate(0)
        writer.writerow([csv_safe(value) for value in row])
        yield buffer.getvalue()


def export(db, user, filters):
    validate_filters(user, filters)
    query = records.scoped_query(user, filters, export=True).order_by(EmojiRecord.event_at.desc(), EmojiRecord.id)
    rows = db.execute(query.execution_options(yield_per=500))
    def values():
        try:
            for record, session, course in rows:
                yield (record.id, session.id, course.id, course.code, course.name, session.class_name,
                       record.user_id, record.emoji_type.value, record.source.value,
                       record.event_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"),
                       record.received_at.astimezone(timezone.utc).isoformat().replace("+00:00", "Z"), record.confidence)
        finally:
            rows.close()
    return csv_stream(values())
