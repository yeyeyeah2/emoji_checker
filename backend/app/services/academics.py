from app.core.errors import AppError
from app.models import ClassSession, Course, UserRole, UserStatus
from app.repositories import academics as repo, records, users
from app.repositories.common import save
from app.services.common import validate_range


def require_teacher(db, teacher_id):
    teacher = users.get(db, teacher_id, lock=True)
    if teacher is None or teacher.role != UserRole.TEACHER or teacher.status != UserStatus.ACTIVE:
        raise AppError(422, "validation_error", "teacher_id 必须对应有效教师")


def require_session(db, user, session_id, *, lock=False, staff_only=False):
    item = repo.get_session(db, session_id, lock=lock)
    if item is None:
        raise AppError(404, "not_found", "课堂不存在")
    course = repo.get_course(db, item.course_id)
    allowed = (user.role == UserRole.ADMIN or
               (user.role == UserRole.TEACHER and course.teacher_id == user.id) or
               (not staff_only and user.role == UserRole.STUDENT and repo.scheduled(db, item.id, user.id)))
    if not allowed:
        raise AppError(403, "forbidden", "没有访问该课堂的权限")
    return item


def create_course(db, body):
    require_teacher(db, body.teacher_id)
    return save(db, Course(**body.model_dump()))


def patch_course(db, course_id, body):
    item = repo.get_course(db, course_id, lock=True)
    if item is None:
        raise AppError(404, "not_found", "课程不存在")
    values = body.model_dump(exclude_unset=True)
    if "teacher_id" in values:
        require_teacher(db, values["teacher_id"])
    for field, value in values.items():
        setattr(item, field, value)
    return save(db, item)


def create_session(db, body):
    course = repo.get_course(db, body.course_id)
    if course is None or not course.is_active:
        raise AppError(422, "validation_error", "course_id 必须对应有效课程")
    return save(db, ClassSession(**body.model_dump()))


def patch_session(db, session_id, body):
    item = repo.get_session(db, session_id, lock=True)
    if item is None:
        raise AppError(404, "not_found", "课堂不存在")
    values = body.model_dump(exclude_unset=True)
    starts, ends = values.get("starts_at", item.starts_at), values.get("ends_at", item.ends_at)
    validate_range(starts, ends)
    if records.outside_interval(db, item.id, starts, ends):
        raise AppError(409, "conflict", "调整后的课堂时间不能排除已有记录")
    for field, value in values.items():
        setattr(item, field, value)
    return save(db, item)


def replace_schedule(db, session_id, body, admin):
    item = repo.get_session(db, session_id, lock=True)
    if item is None:
        raise AppError(404, "not_found", "课堂不存在")
    students = repo.students(db, body.user_ids)
    if len(students) != len(body.user_ids) or any(u.role != UserRole.STUDENT or u.status != UserStatus.ACTIVE for u in students):
        raise AppError(422, "validation_error", "user_ids 必须全部对应有效学生")
    repo.replace_schedule(db, session_id, body.user_ids, admin.id)
    return {"session_id": session_id, "user_ids": body.user_ids}


def roster(db, user, session_id):
    require_session(db, user, session_id, staff_only=True)
    return repo.roster(db, session_id)
