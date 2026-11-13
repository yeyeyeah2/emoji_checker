# 表情符号课堂情绪检查器系统

《软件工程实践》课程项目，支持学生主动提交 Emoji 情绪记录、AI 课堂情绪分析、教师历史查询及管理员统计管理。

## 技术架构

- 后端：Python + FastAPI
- 数据库：PostgreSQL
- 客户端：待团队确认
- 管理端：React + TypeScript + Vite + ECharts
- AI 服务：Python + OpenCV，可选 ONNX/FER 推理后端，独立部署
- 数据交互：REST API / JSON，实时看板使用 WebSocket

## 项目结构

- `backend/`：数据库、认证授权、业务 API、AI 入库
- `client/`：学生及教师客户端
- `admin-web/`：管理端、实时看板和多维统计
- `ai-service/`：匿名视频情绪推理与后端入库
- `docs/`：需求、接口契约及必要设计文档

## 快速开始

后端要求 Python 3.11+ 和 PostgreSQL：

```sh
cd backend
cp .env.example .env
python -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
alembic upgrade head
uvicorn app.main:app --reload
```

管理端：

```sh
cd admin-web
npm install
npm run dev
```

AI 服务：

```sh
cd ai-service
python -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env
# 配置后端 AI 令牌、课堂 ID、视频源和模型路径
emoji-ai
```

管理端开发服务器默认代理后端的 `http://localhost:8000`。后端 Swagger UI 位于 `/docs`；接口请求、响应、权限和 AI 入库字段见 [`docs/api-contract.md`](docs/api-contract.md)。AI 模型不随仓库分发，模型接口和隐私约束见 [`ai-service/README.md`](ai-service/README.md)。

## 测试

```sh
cd admin-web && npm test && npm run build
cd ../ai-service && pytest
```

后端集成测试需要独立 PostgreSQL 测试库，并要求库名以 `_test` 结尾：

```sh
cd backend
TEST_DATABASE_URL=postgresql+psycopg://用户名:密码@localhost:5432/emoji_checker_test pytest
```

## 团队协作

各成员负责各自模块，通过统一 API 契约进行集成，接口变更须及时同步。分支提交应真实可追溯，不提交 `.env`、令牌、视频、人脸图像、模型权重或构建产物。
