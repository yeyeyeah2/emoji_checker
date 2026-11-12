# 表情符号课堂情绪检查器系统

《软件工程实践》课程项目，支持学生主动提交 Emoji 情绪记录、AI 课堂情绪分析、教师历史查询及管理员统计管理。

## 技术架构

- 后端：Python + FastAPI
- 数据库：PostgreSQL
- 客户端：待团队确认
- 管理端：待团队确认
- AI 服务：Python，独立部署
- 数据交互：REST API / JSON，实时看板使用 WebSocket

## 项目结构

- `backend/`：数据库、认证授权、业务 API、AI 入库
- `client/`：学生及教师客户端
- `admin-web/`：管理端
- `ai-service/`：AI 推理服务
- `docs/`：需求、接口契约及必要设计文档

## 开发与运行

后端环境准备、运行配置、数据库迁移和测试命令见“后端本地运行”章节。

## 接口文档

后端启动后，通过 `/docs` 访问 Swagger UI。

## 团队协作

各成员负责各自模块，通过统一 API 契约进行集成，接口变更需及时同步。


## 后端本地运行

要求 Python 3.11+ 和 PostgreSQL。创建数据库后，在 `backend/` 中复制 `.env.example` 为 `.env` 并设置密钥：

```sh
cd backend
cp .env.example .env
# 修改 .env 中的密钥和 PostgreSQL 连接串
python -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
alembic upgrade head
uvicorn app.main:app --reload
```

API 文档默认位于 `/docs`。接口请求、响应、权限和 AI 入库字段见 [`docs/api-contract.md`](docs/api-contract.md)。测试前创建独立 PostgreSQL 测试库，并在 `backend/` 执行 `TEST_DATABASE_URL=postgresql+psycopg://用户名:密码@localhost:5432/emoji_checker_test pytest`；测试仅在专用库的临时 schema 内执行 Alembic 迁移和数据清理，库名必须以 `_test` 结尾。
