from fastapi import APIRouter
from sqlalchemy import text

from app.api.dependencies import Db
from app.schemas import DataEnvelope, HealthOut

router = APIRouter(tags=["运行状态"])


@router.get("/health/live", response_model=DataEnvelope[HealthOut], response_model_exclude_none=True, summary="进程存活检查")
def live():
    return {"data": {"status": "ok"}}


@router.get("/health/ready", response_model=DataEnvelope[HealthOut], response_model_exclude_none=True, summary="数据库就绪检查")
def ready(db: Db):
    db.execute(text("SELECT 1"))
    return {"data": {"status": "ok", "database": "ok"}}
