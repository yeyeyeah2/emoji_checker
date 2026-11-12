from sqlalchemy import func, or_, select
from sqlalchemy.dialects.postgresql import insert

from app.models import ClassSession, Course, EmojiRecord, RecordSource, UserRole


def scoped_query(user, filters, *, export=False):
    columns = (EmojiRecord, ClassSession, Course) if export else (EmojiRecord,)
    query = select(*columns).select_from(EmojiRecord).join(ClassSession).join(Course)
    if user.role == UserRole.STUDENT:
        query = query.where(EmojiRecord.user_id == user.id)
    elif user.role == UserRole.TEACHER:
        query = query.where(Course.teacher_id == user.id)
    mapping = {"session_id": EmojiRecord.session_id, "course_id": Course.id,
               "user_id": EmojiRecord.user_id, "emoji_type": EmojiRecord.emoji_type,
               "source": EmojiRecord.source, "class_name": ClassSession.class_name}
    for name, column in mapping.items():
        if filters.get(name) is not None:
            query = query.where(column == filters[name])
    if filters.get("from_") is not None:
        query = query.where(EmojiRecord.event_at >= filters["from_"])
    if filters.get("to") is not None:
        query = query.where(EmojiRecord.event_at < filters["to"])
    return query


def by_event_id(db, event_id):
    return db.scalar(select(EmojiRecord).where(EmojiRecord.event_id == event_id))


def insert_ai(db, values):
    statement = (insert(EmojiRecord).values(**values).on_conflict_do_nothing(
        index_elements=[EmojiRecord.event_id]).returning(EmojiRecord))
    return db.scalar(statement)


def outside_interval(db, session_id, starts, ends):
    return db.scalar(select(EmojiRecord.id).where(EmojiRecord.session_id == session_id,
        or_(EmojiRecord.event_at < starts, EmojiRecord.event_at >= ends)).limit(1)) is not None


def statistics(db, query, dimensions, bucket):
    scoped = query.with_only_columns(
        EmojiRecord.id, EmojiRecord.user_id, EmojiRecord.source, EmojiRecord.emoji_type,
        EmojiRecord.event_at, ClassSession.class_name, ClassSession.id.label("session_id"),
        Course.code.label("course_code"), maintain_column_froms=True).subquery()
    counts = [func.count().label("record_count"),
              func.count().filter(scoped.c.source == RecordSource.MANUAL).label("manual_count"),
              func.count().filter(scoped.c.source == RecordSource.AI).label("ai_count"),
              func.count(func.distinct(scoped.c.user_id)).label("student_count")]
    totals = db.execute(select(*counts).select_from(scoped)).mappings().one()
    mapping = {"course": scoped.c.course_code, "class": scoped.c.class_name,
               "session": scoped.c.session_id, "emoji_type": scoped.c.emoji_type,
               "source": scoped.c.source}
    groups = [mapping[name].label(name) for name in dimensions]
    if bucket:
        groups.append(func.date_trunc(bucket, scoped.c.event_at, "UTC").label("period"))
    statement = select(*groups, *counts).select_from(scoped)
    if groups:
        statement = statement.group_by(*groups).order_by(*groups)
    rows = db.execute(statement).mappings().all() if totals["record_count"] else []
    return totals, rows


def dashboard_rows(db, session_id, start, end):
    predicates = [EmojiRecord.session_id == session_id,
                  EmojiRecord.event_at >= start, EmojiRecord.event_at < end]
    counts = db.execute(select(EmojiRecord.emoji_type, EmojiRecord.source, func.count())
        .where(*predicates).group_by(EmojiRecord.emoji_type, EmojiRecord.source)).all()
    minute = func.date_trunc("minute", EmojiRecord.event_at, "UTC").label("minute")
    trend = db.execute(select(minute, EmojiRecord.emoji_type, EmojiRecord.source, func.count())
        .where(*predicates).group_by(minute, EmojiRecord.emoji_type, EmojiRecord.source)
        .order_by(minute, EmojiRecord.emoji_type, EmojiRecord.source)).all()
    return counts, trend
