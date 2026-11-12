from fastapi import APIRouter

from app.api.dependencies import CurrentUser, Db
from app.schemas import AuthOut, DataEnvelope, LoginInput, PasswordInput, RegisterInput, UpdateOut
from app.services import auth

router = APIRouter(prefix="/auth", tags=["认证"])


@router.post("/register", status_code=201, response_model=AuthOut, summary="注册并登录")
def register(body: RegisterInput, db: Db):
    return auth.register(db, body)


@router.post("/login", response_model=AuthOut, summary="用户名或邮箱登录")
def login(body: LoginInput, db: Db):
    return auth.login(db, body)


@router.put("/password", response_model=DataEnvelope[UpdateOut], summary="修改密码并使旧令牌失效")
def change_password(body: PasswordInput, db: Db, user: CurrentUser):
    return auth.change_password(db, user, body)
