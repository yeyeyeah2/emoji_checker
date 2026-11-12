from typing import Literal

from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

from app.api.dependencies import Admin, CurrentUser, Db, Filters, Student
from app.schemas import DataEnvelope, EmojiInput, EmojiOut, PageEnvelope
from app.services import emoji

router = APIRouter(tags=["Emoji"])


@router.post("/emoji", status_code=201, response_model=DataEnvelope[EmojiOut], summary="学生提交一条课堂情绪记录")
def create_manual(body: EmojiInput, db: Db, user: Student):
    return {"data": emoji.create_manual(db, user, body)}


@router.get("/emoji/history", response_model=PageEnvelope[EmojiOut], summary="查询权限范围内的情绪历史")
def history(db: Db, user: CurrentUser, filters: Filters,
            limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    return emoji.history(db, user, filters, limit, offset)


@router.get("/admin/emoji", response_model=PageEnvelope[EmojiOut], summary="管理员查询情绪记录")
def admin_history(db: Db, user: Admin, filters: Filters,
                  limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    return emoji.history(db, user, filters, limit, offset)


@router.get("/admin/emoji/export", response_class=StreamingResponse,
            responses={200: {"description": "UTF-8 BOM CSV 文件", "content": {"text/csv": {"schema": {"type": "string"}}}}},
            summary="管理员导出情绪记录")
def export(db: Db, user: Admin, filters: Filters, format: Literal["csv"] = "csv"):
    return StreamingResponse(emoji.export(db, user, filters), media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="emoji-records.csv"', "Cache-Control": "no-store"})
