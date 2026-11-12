from uuid import UUID

from fastapi import APIRouter, Query

from app.api.dependencies import Admin, CurrentUser, Db
from app.models import UserRole, UserStatus
from app.repositories import users as repo
from app.repositories.common import page
from app.schemas import DataEnvelope, PageEnvelope, ProfileInput, UserAdminInput, UserOut
from app.services import users

router = APIRouter(tags=["用户"])


@router.get("/users/me", response_model=DataEnvelope[UserOut], summary="读取本人资料")
def get_me(user: CurrentUser):
    return {"data": user}


@router.patch("/users/me", response_model=DataEnvelope[UserOut], summary="修改本人资料")
def patch_me(body: ProfileInput, db: Db, user: CurrentUser):
    return {"data": users.patch_profile(db, user, body)}


@router.get("/admin/users", response_model=PageEnvelope[UserOut], summary="管理员查询用户")
def list_users(db: Db, admin: Admin, limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0),
               role: UserRole | None = None, status: UserStatus | None = None,
               q: str | None = Query(None, max_length=120)):
    return page(db, repo.page_query(role, status, q), limit, offset)


@router.patch("/admin/users/{user_id}", response_model=DataEnvelope[UserOut], summary="修改用户角色或状态")
def patch_user(user_id: UUID, body: UserAdminInput, db: Db, admin: Admin):
    return {"data": users.patch_user(db, admin, user_id, body)}
