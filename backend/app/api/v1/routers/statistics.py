from typing import Literal

from fastapi import APIRouter, Query

from app.api.dependencies import Admin, Db, Filters, Staff
from app.schemas import DataEnvelope, StatisticsOut
from app.services.statistics import summarize

router = APIRouter(tags=["统计"])


@router.get("/statistics", response_model=DataEnvelope[StatisticsOut], response_model_exclude_none=True,
            summary="教师或管理员按课程、班级和时段统计")
def statistics(db: Db, user: Staff, filters: Filters,
               group_by: str = Query("emoji_type", max_length=120), bucket: Literal["hour", "day"] | None = None):
    return {"data": summarize(db, user, filters, group_by, bucket)}


@router.get("/admin/statistics", response_model=DataEnvelope[StatisticsOut], response_model_exclude_none=True,
            summary="管理员多维统计")
def admin_statistics(db: Db, user: Admin, filters: Filters,
                     group_by: str = Query("course,class", max_length=120), bucket: Literal["hour", "day"] | None = None):
    return {"data": summarize(db, user, filters, group_by, bucket)}
