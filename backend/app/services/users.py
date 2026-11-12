from app.core.errors import AppError
from app.models import UserRole, UserStatus
from app.repositories import users
from app.repositories.common import save


def patch_profile(db, user, body):
    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(user, field, str(value).lower())
    return save(db, user)


def patch_user(db, admin, user_id, body):
    target = users.get(db, user_id, lock=True)
    if target is None:
        raise AppError(404, "not_found", "用户不存在")
    values = body.model_dump(exclude_unset=True)
    role = values.get("role", target.role)
    status = values.get("status", target.status)
    if target.id == admin.id and (role != UserRole.ADMIN or status != UserStatus.ACTIVE):
        raise AppError(409, "conflict", "管理员不能降级或停用自己")
    if role != target.role:
        if ((users.has_teaching(db, target.id) and role != UserRole.TEACHER)
                or (users.has_student_data(db, target.id) and role != UserRole.STUDENT)):
            raise AppError(409, "conflict", "用户已有关联课程、名单或记录，不能变更角色")
    if role != target.role or status != target.status:
        target.auth_version += 1
    target.role, target.status = role, status
    return save(db, target)
