# 表情符号课堂情绪检查器

《软件工程实践》课程项目。学生可提交课堂 Emoji 情绪记录，教师可查看授课课堂数据，管理员可管理课程和用户、统计及导出数据；独立 AI 服务可匿名写入情绪分析结果。

## 项目模块

| 目录 | 职责 | 使用说明 |
| --- | --- | --- |
| `backend/` | FastAPI、PostgreSQL、认证授权、业务 API 和 AI 结果入库 | 本页“后端启动” |
| `client/` | 学生与教师浏览器客户端 | [`client/README.md`](client/README.md) |
| `admin-web/` | 管理端、实时看板和多维统计 | [`admin-web/README.md`](admin-web/README.md) |
| `ai-service/` | 视频情绪推理与匿名结果入库 | [`ai-service/README.md`](ai-service/README.md) |
| `docs/` | 实验指导书及团队接口契约 | [`docs/api-contract.md`](docs/api-contract.md) |

技术栈：Python、FastAPI、PostgreSQL、SQLAlchemy、Alembic、React、TypeScript 和 Vite。各模块独立运行，通过 REST/JSON 交互；实时课堂看板使用 WebSocket。

## 后端启动

需要 Python 3.11+ 和 PostgreSQL。先创建数据库，并在 `backend/` 下配置 `.env`：

```sh
cd backend
cp .env.example .env
```

将 `.env` 中的数据库地址和各项密钥替换为本地配置，再运行：

```sh
python -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
alembic upgrade head
uvicorn app.main:app --reload
```

Swagger UI 默认位于 `/docs`。修改表结构后通过 Alembic 迁移；不要将 `.env` 或真实令牌提交到仓库。

## 测试

各模块测试命令：

```sh
cd backend
TEST_DATABASE_URL=postgresql+psycopg://用户名:密码@localhost:5432/emoji_checker_test pytest

cd ../client && npm test && npm run build
cd ../admin-web && npm test && npm run build
cd ../ai-service && pytest
```

后端测试要求 PostgreSQL 测试库名称以 `_test` 结尾，并在临时 schema 中运行迁移与清理。API 路径、字段、权限和错误格式见 [`docs/api-contract.md`](docs/api-contract.md)。
