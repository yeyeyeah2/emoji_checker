from fastapi import APIRouter, Depends, Response

from app.api.dependencies import Db, ai_service
from app.schemas import AIEmojiInput, AIResultOut
from app.services.emoji import create_ai

router = APIRouter(prefix="/ai", tags=["AI 入库"], dependencies=[Depends(ai_service)])


@router.post("/emoji-results", status_code=201, response_model=AIResultOut,
             responses={200: {"model": AIResultOut, "description": "同一事件的幂等重试"}}, summary="写入匿名 AI 情绪结果")
def create_ai_result(body: AIEmojiInput, db: Db, response: Response):
    record, replay = create_ai(db, body)
    response.status_code = 200 if replay else 201
    return {"data": record, "meta": {"idempotent_replay": replay}}
