# 后端接口契约

API 前缀 `/api/v1`，成功响应使用 `{"data": ...}`；分页响应另含 `meta: {limit, offset, total}`。错误响应为 `{"error":{"code":"...","message":"...","details":...}}`。时间均使用带时区的 ISO 8601 UTC；筛选区间为 `[from, to)`。认证使用 `Authorization: Bearer <JWT>`，AI 写入使用独立的 AI 服务令牌。

## 认证与用户

- `POST /auth/register`：`{username,email,password,role?,invite_code?}`。角色默认为 `STUDENT`；管理员需有效邀请码。成功 `201`，返回令牌、秒数形式的 `expires_in` 和用户资料。
- `POST /auth/login`：`{identifier,password}`，identifier 可为用户名或邮箱。成功 `200`。
- `PUT /auth/password`：`{current_password,new_password}`；新密码至少 12 字符。成功后旧令牌立即失效。
- `GET /users/me`、`PATCH /users/me`：本人资料；可更新 `username`、`email`。
- `GET /admin/users?limit=50&offset=0&role=&status=&q=`：管理员用户分页查询。
- `PATCH /admin/users/{user_id}`：`{status?,role?}`；状态为 `ACTIVE`/`DISABLED`，角色为 `STUDENT`/`TEACHER`/`ADMIN`。

## 课程、课堂与名单

- `GET /courses`：管理员看全局，教师看本人课程，学生看已安排课堂对应课程。
- `POST /admin/courses`：`{code,name,teacher_id,is_active?}`；`PATCH /admin/courses/{course_id}` 可更新上述字段。
- `GET /sessions?course_id=&from=&to=&limit=50&offset=0`：返回当前用户可见课堂。
- `POST /admin/sessions`：`{course_id,class_name,starts_at,ends_at,status?}`；时间必须带时区且开始早于结束。
- `PATCH /admin/sessions/{session_id}`：可更新 `class_name`、时间及 `status`（`SCHEDULED`/`CANCELLED`）。
- `PUT /admin/sessions/{session_id}/schedule`：`{user_ids:[UUID,...]}`，原子地完整替换名单；仅接受有效学生。
- `GET /sessions/{session_id}/schedule`：课堂授课教师及管理员可查看名单，返回 `id` 和 `username`，不暴露学生邮箱。

## Emoji、统计、看板与 AI

- `POST /emoji`：`{session_id,emoji_type}`；学生须被安排在进行中的课堂。Emoji 类型：`HAPPY`、`SAD`、`ANGRY`、`FEARFUL`、`SURPRISED`、`NEUTRAL`。
- `GET /emoji/history`：学生仅本人，教师仅本人授课范围，管理员全局；筛选参数 `session_id`、`course_id`、`user_id`、`emoji_type`、`source`、`from`、`to`、`limit`、`offset`。来源为 `MANUAL`/`AI`。
- `GET /statistics`：教师本人授课范围，管理员亦可读取；筛选 `session_id`、`course_id`、`class`、`from`、`to`、`user_id`、`emoji_type`、`source`；`group_by` 可组合 `course,class,session,emoji_type,source`，`bucket` 可为 `hour` 或 `day`。默认按 Emoji 类型分组，返回总数、人工/AI 数、去重学生数及分组占比。
- `GET /admin/emoji`：管理员全局记录分页及同历史接口的筛选。
- `GET /admin/statistics`：管理员多维统计。筛选 `session_id`、`course_id`、`class`、`from`、`to`、`emoji_type`、`source`；`group_by` 可组合 `course,class,session,emoji_type,source`，`bucket` 可为 `hour` 或 `day`。返回分组数、匹配记录占比、人工/AI 数和去重学生数。
- `GET /admin/emoji/export?format=csv`：支持 Emoji 列表相同筛选，流式返回 UTF-8 BOM CSV，文本单元格防公式注入。
- `GET /dashboard/realtime?session_id={UUID}`：管理员或该课教师读取快照。包含近 30 分钟按 Emoji/来源计数及分钟趋势。
- `WS /api/v1/ws/dashboard?session_id={UUID}`：每 5 秒发送 `{type:"dashboard.snapshot",generated_at,data}`。发送 `Authorization: Bearer <JWT>`，浏览器也可使用 WebSocket 子协议 `bearer` 后紧跟 JWT；服务端仅选择 `bearer` 子协议。
- `POST /ai/emoji-results`：独立 AI Bearer 令牌；请求 `{event_id,session_id,event_at,emoji_type,confidence,source_id?}`。置信度默认阈值 `0.60`；仅接受落在未取消课堂时间范围内的事件。新事件返回 `201`；重复 `event_id` 且字段相同返回已存记录和 `200`，并标记 `meta.idempotent_replay=true`；同一 ID 对应不同字段返回 `409 conflict`。
- `GET /health/live`、`GET /health/ready`：存活与数据库就绪检查。

常见错误码：`validation_error`（422）、`authentication_required`/`invalid_credentials`（401）、`forbidden`（403）、`not_found`（404）、`conflict`/`session_not_active`（409）、`confidence_below_threshold`（422）。
