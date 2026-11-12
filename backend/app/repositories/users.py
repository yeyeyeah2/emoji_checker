from sqlalchemy import or_, select

from app.models import Course, EmojiRecord, ScheduleUser, User


def get(db, user_id, *, lock=False):
    query = select(User).where(User.id == user_id)
    if lock:
        query = query.with_for_update().execution_options(populate_existing=True)
    return db.scalar(query)


def by_identifier(db, identifier):
    return db.scalar(select(User).where(or_(User.username == identifier, User.email == identifier)))


def page_query(role=None, status=None, q=None):
    query = select(User)
    if role:
        query = query.where(User.role == role)
    if status:
        query = query.where(User.status == status)
    if q:
        query = query.where(or_(User.username.contains(q.lower(), autoescape=True),
                               User.email.contains(q.lower(), autoescape=True)))
    return query.order_by(User.created_at.desc(), User.id)


def has_teaching(db, user_id):
    return db.scalar(select(Course.id).where(Course.teacher_id == user_id).limit(1)) is not None


def has_student_data(db, user_id):
    return (db.scalar(select(ScheduleUser.id).where(ScheduleUser.user_id == user_id).limit(1)) is not None
            or db.scalar(select(EmojiRecord.id).where(EmojiRecord.user_id == user_id).limit(1)) is not None)
