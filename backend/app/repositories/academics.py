from sqlalchemy import delete, select

from app.models import ClassSession, Course, ScheduleUser, User, UserRole


def get_course(db, course_id, *, lock=False):
    query = select(Course).where(Course.id == course_id)
    if lock:
        query = query.with_for_update().execution_options(populate_existing=True)
    return db.scalar(query)


def get_session(db, session_id, *, lock=False):
    query = select(ClassSession).where(ClassSession.id == session_id)
    if lock:
        query = query.with_for_update().execution_options(populate_existing=True)
    return db.scalar(query)


def courses_query(user):
    query = select(Course)
    if user.role == UserRole.TEACHER:
        query = query.where(Course.teacher_id == user.id)
    elif user.role == UserRole.STUDENT:
        enrolled = select(ClassSession.id).join(ScheduleUser).where(
            ClassSession.course_id == Course.id, ScheduleUser.user_id == user.id).exists()
        query = query.where(enrolled)
    return query.order_by(Course.created_at.desc(), Course.id)


def sessions_query(user, course_id=None, from_=None, to=None):
    query = select(ClassSession).join(Course)
    if user.role == UserRole.TEACHER:
        query = query.where(Course.teacher_id == user.id)
    elif user.role == UserRole.STUDENT:
        query = query.where(select(ScheduleUser.id).where(
            ScheduleUser.session_id == ClassSession.id, ScheduleUser.user_id == user.id).exists())
    if course_id:
        query = query.where(ClassSession.course_id == course_id)
    if from_:
        query = query.where(ClassSession.ends_at > from_)
    if to:
        query = query.where(ClassSession.starts_at < to)
    return query.order_by(ClassSession.starts_at.desc(), ClassSession.id)


def scheduled(db, session_id, user_id):
    return db.scalar(select(ScheduleUser.id).where(
        ScheduleUser.session_id == session_id, ScheduleUser.user_id == user_id)) is not None


def students(db, user_ids):
    return db.scalars(select(User).where(User.id.in_(user_ids)).order_by(User.id).with_for_update()).all()


def replace_schedule(db, session_id, user_ids, admin_id):
    db.execute(delete(ScheduleUser).where(ScheduleUser.session_id == session_id))
    db.add_all([ScheduleUser(session_id=session_id, user_id=user_id, assigned_by=admin_id)
                for user_id in user_ids])
    db.commit()


def roster(db, session_id):
    return db.scalars(select(User).join(ScheduleUser, ScheduleUser.user_id == User.id)
                      .where(ScheduleUser.session_id == session_id).order_by(User.username)).all()
