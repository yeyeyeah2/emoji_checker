from fastapi import APIRouter

from app.api.v1.routers import academics, ai, auth, dashboard, emoji, health, statistics, users

api_router = APIRouter()
for router in (auth.router, users.router, academics.router, emoji.router, statistics.router, dashboard.router, ai.router, health.router):
    api_router.include_router(router)
