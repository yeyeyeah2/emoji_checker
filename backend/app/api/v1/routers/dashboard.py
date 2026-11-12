import asyncio
from uuid import UUID

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from starlette.concurrency import run_in_threadpool

from app.api.dependencies import Db, Staff
from app.core.config import get_settings
from app.core.errors import AppError
from app.db.session import SessionLocal
from app.schemas import DashboardMessage, DashboardOut, DataEnvelope
from app.services.dashboard import authenticated_snapshot, snapshot

router = APIRouter(tags=["实时看板"])


@router.get("/dashboard/realtime", response_model=DataEnvelope[DashboardOut], summary="读取最近 30 分钟的课堂情绪快照")
def realtime_dashboard(session_id: UUID, db: Db, user: Staff):
    return {"data": snapshot(db, user, session_id)}


def parse_token(websocket):
    scheme, _, token = websocket.headers.get("authorization", "").partition(" ")
    if scheme.lower() == "bearer" and token:
        return token
    protocols = websocket.scope.get("subprotocols", [])
    if len(protocols) == 2 and protocols[0] == "bearer":
        return protocols[1]
    return None


@router.websocket("/ws/dashboard")
async def dashboard_socket(websocket: WebSocket, session_id: UUID):
    settings = get_settings()
    origin = websocket.headers.get("origin")
    if origin and origin.rstrip("/") not in settings.allowed_origins:
        await websocket.close(code=4403, reason="来源未获授权")
        return
    token = parse_token(websocket)
    if not token:
        await websocket.close(code=4401, reason="需要登录")
        return
    async def read_snapshot():
        return await run_in_threadpool(authenticated_snapshot, SessionLocal, token, session_id)
    try:
        initial = await read_snapshot()
    except AppError as exc:
        await websocket.close(code=4401 if exc.status_code == 401 else 4403, reason=exc.message)
        return
    except Exception:
        await websocket.close(code=1011, reason="服务暂不可用")
        return
    await websocket.accept(subprotocol="bearer" if "bearer" in websocket.scope.get("subprotocols", []) else None)

    try:
        while True:
            message = DashboardMessage(generated_at=initial["generated_at"], data=initial)
            await websocket.send_json(message.model_dump(mode="json"))
            try:
                event = await asyncio.wait_for(websocket.receive(), timeout=settings.dashboard_poll_seconds)
                if event["type"] == "websocket.disconnect":
                    return
                await websocket.close(code=4400, reason="看板连接仅支持服务端推送")
                return
            except asyncio.TimeoutError:
                pass
            try:
                initial = await read_snapshot()
            except AppError as exc:
                await websocket.close(code=4401 if exc.status_code == 401 else 4403, reason=exc.message)
                return
            except Exception:
                await websocket.close(code=1011, reason="服务暂不可用")
                return
    except WebSocketDisconnect:
        return
    except AppError as exc:
        await websocket.close(code=4401 if exc.status_code == 401 else 4403, reason=exc.message)
    except Exception:
        await websocket.close(code=1011, reason="服务暂不可用")
