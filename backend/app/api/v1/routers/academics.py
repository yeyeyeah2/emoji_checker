from uuid import UUID

from fastapi import APIRouter, Query

from app.api.dependencies import Admin, CurrentUser, Db, Staff
from app.repositories import academics as repo
from app.repositories.common import page
from app.schemas import (CourseInput, CourseOut, CoursePatch, DataEnvelope, PageEnvelope,
                         ScheduleInput, ScheduleOut, SessionInput, SessionOut, SessionPatch,
                         RosterStudent, UserOut, UTCDateTime)
from app.services import academics
from app.services.common import validate_range

router = APIRouter(tags=["课程与课堂"])


@router.get("/courses", response_model=PageEnvelope[CourseOut], summary="查询有权访问的课程")
def list_courses(db: Db, user: CurrentUser, limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    return page(db, repo.courses_query(user), limit, offset)


@router.post("/admin/courses", status_code=201, response_model=DataEnvelope[CourseOut], summary="创建课程")
def create_course(body: CourseInput, db: Db, admin: Admin):
    return {"data": academics.create_course(db, body)}


@router.patch("/admin/courses/{course_id}", response_model=DataEnvelope[CourseOut], summary="修改课程")
def patch_course(course_id: UUID, body: CoursePatch, db: Db, admin: Admin):
    return {"data": academics.patch_course(db, course_id, body)}


@router.get("/sessions", response_model=PageEnvelope[SessionOut], summary="查询与时间区间重叠的可见课堂")
def list_sessions(db: Db, user: CurrentUser, course_id: UUID | None = None,
                  from_: UTCDateTime | None = Query(None, alias="from"), to: UTCDateTime | None = None,
                  limit: int = Query(50, ge=1, le=100), offset: int = Query(0, ge=0)):
    validate_range(from_, to)
    return page(db, repo.sessions_query(user, course_id, from_, to), limit, offset)


@router.post("/admin/sessions", status_code=201, response_model=DataEnvelope[SessionOut], summary="创建课堂")
def create_session(body: SessionInput, db: Db, admin: Admin):
    return {"data": academics.create_session(db, body)}


@router.patch("/admin/sessions/{session_id}", response_model=DataEnvelope[SessionOut], summary="修改或取消课堂")
def patch_session(session_id: UUID, body: SessionPatch, db: Db, admin: Admin):
    return {"data": academics.patch_session(db, session_id, body)}


@router.put("/admin/sessions/{session_id}/schedule", response_model=DataEnvelope[ScheduleOut], summary="完整替换课堂学生名单")
def replace_schedule(session_id: UUID, body: ScheduleInput, db: Db, admin: Admin):
    return {"data": academics.replace_schedule(db, session_id, body, admin)}


@router.get("/sessions/{session_id}/schedule", response_model=DataEnvelope[list[RosterStudent]], summary="教师或管理员查看课堂名单")
def get_schedule(session_id: UUID, db: Db, user: Staff):
    return {"data": [{"id": student.id, "username": student.username} for student in academics.roster(db, user, session_id)]}
