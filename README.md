# 表情符号课堂情绪检查器

《软件工程实践》课程项目。学生可提交课堂 Emoji 情绪记录，教师可查看授课课堂数据，管理员可管理课程和用户、统计及导出数据；独立 AI 服务可匿名写入情绪分析结果。

## 项目模块

| 目录 | 职责 | 使用说明 |
| --- | --- | --- |
| `backend/` | FastAPI、PostgreSQL、认证授权、业务 API 和 AI 结果入库 | 本页“后端启动” |
| `client/` | 学生与教师浏览器客户端 | [客户端说明](#客户端说明) |
| `admin-web/` | 管理端、实时看板和多维统计 | [管理端说明](#管理端说明) |
| `ai-service/` | 视频情绪推理与匿名结果入库 | [AI-服务说明](#ai-服务说明) |
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


## 客户端说明

表情符号课堂情绪检查器的浏览器客户端，覆盖实验指导书「客户端」必做功能：

- 学生：注册、登录、修改密码、选择进行中的课堂提交 Emoji、查看个人历史
- 教师：登录、查看所授课堂的历史 Emoji、按课程 / 班级 / 时段做基础统计
- 通用：JWT 登录态、角色路由守卫、401 自动退出、分页与筛选、响应式布局

### 技术栈

- React 19 + TypeScript + Vite 6
- React Router 7
- 原生 CSS（无 UI 框架）
- Vitest（纯函数单元测试）

### 架构（MVVM）

| 层 | 目录 / 文件 | 职责 |
|---|---|---|
| View | `src/pages`、`src/components` | 页面与可复用界面组件，只负责渲染和触发用户操作 |
| ViewModel | `src/viewmodels` | 登录态、课堂状态、提交、筛选、分页、统计聚合等交互状态 |
| Repository | `src/api` | 封装 `/api/v1` 请求、JWT 注入、统一错误解析、演示模式适配 |
| Model | `src/api/types.ts`、`src/lib` | 与后端 schema 对应的类型、Emoji 映射、时间 / 统计格式化 |

目录：

```
client/
├─ public/favicon.svg
├─ src/
│  ├─ api/            # Repository：client、auth、courses、sessions、emoji、statistics、mock
│  ├─ auth/           # token 存储
│  ├─ components/     # 通用组件
│  ├─ lib/            # 纯函数与格式化
│  ├─ pages/          # 登录、注册、学生端、教师端、管理员提示
│  ├─ viewmodels/     # AuthProvider、useStudentViewModel、useTeacherViewModel 等
│  ├─ App.tsx         # 路由与角色守卫
│  ├─ main.tsx
│  └─ styles.css
├─ .env.example
├─ .env.mock
└─ vite.config.ts
```

### 运行

#### 1. 连接真实后端（默认）

要求后端已在 `http://localhost:8000` 运行，且 `backend/.env` 的 `CORS_ORIGINS`
包含 `http://localhost:5173`（仓库自带示例已包含）。

```bash
cd client
npm install
cp .env.example .env
npm run dev
```

打开 `http://localhost:5173`。`.env` 默认：

```dotenv
VITE_API_BASE_URL=http://localhost:8000/api/v1
VITE_USE_MOCK=false
```

> 请通过 `http://localhost:5173` 访问，而不是 `127.0.0.1`，否则默认 CORS 白名单可能不匹配。

#### 2. 演示模式（无需后端 / 数据库）

本机没有 PostgreSQL 时，可用内置 Mock API 直接演示完整界面：

```bash
cd client
npm install
npm run dev:mock
```

演示账号：

| 身份 | 用户名 | 密码 |
|---|---|---|
| 学生 | `student` | `student12345` |
| 教师 | `teacher` | `teacher12345` |

演示数据包含进行中 / 即将开始 / 已结束的课堂、6 种情绪、人工与 AI 记录、班级名单等。
Mock 数据保存在页面内存中，刷新页面会重置（种子账号不受影响，期间新注册的账号会消失）。
Mock 仅用于开发演示，生产构建不会打包（动态导入且被 `VITE_USE_MOCK` 静态开关裁掉）。

### 已实现功能

#### 学生端

- 注册：可选学生 / 教师身份；用户名、邮箱、密码（≥12 位）前后端双重校验
- 登录：用户名或邮箱 + 密码；错误统一提示
- 修改密码：成功后旧 JWT 立即失效，自动回到登录页
- 情绪打卡：只展示「进行中」的课堂；选中课堂后可提交 6 种 Emoji
- 个人历史：按课程 / 情绪 / 来源 / 时间筛选，分页展示；提交成功后自动刷新
- 即将开始的课堂提示（时间、班级、课程）

#### 教师端

- 统计概览：时间范围、课程、分组维度（情绪 / 来源 / 班级 / 课程 / 课堂 / 课程+班级）、
  小时 / 天分桶
- KPI：总记录、人工记录、AI 记录、去重学生数
- 分布图：按记录数排序的水平条形图（单一蓝色序列、直接数值标签、悬停提示、表格视图）
- 历史记录：按课程 / 课堂 / 情绪 / 来源 / 时间筛选，分页
- 选中具体课堂后调用课堂名单接口，把 `user_id` 映射为学生用户名
- 教师数据范围由后端限制为本人所授课程

#### 通用

- 角色路由守卫：学生 / 教师访问对方页面时自动跳回本人首页
- JWT 有效期默认 30 分钟；任何请求返回 401 都会清除本地令牌并回到登录页
- 响应式：桌面双栏、移动端单栏；移动端历史记录自动变为键值卡片
- 无障碍：表单 label、`aria-checked` / `aria-pressed` / `aria-live`、键盘焦点样式、
  图表表格视图与逐条 `aria-label`
- `prefers-reduced-motion` 下关闭动画

### 使用的后端接口

| 接口 | 用途 |
|---|---|
| `POST /auth/register`、`POST /auth/login`、`PUT /auth/password` | 注册、登录、改密 |
| `GET /users/me` | 恢复登录态 |
| `GET /courses` | 可见课程 |
| `GET /sessions` | 可见课堂 / 进行中判断 |
| `GET /sessions/{id}/schedule` | 教师按课堂映射学生用户名 |
| `POST /emoji` | 学生提交情绪 |
| `GET /emoji/history` | 历史记录（角色范围内） |
| `GET /statistics` | 教师基础统计 |

响应统一处理 `{"data": ...}`、分页 `{"data": [...], "meta": {...}}` 与错误
`{"error": {"code","message","details"}}`。

### 质量检查

```bash
npm run typecheck   # TypeScript 严格模式
npm test            # Vitest：28 个用例
npm run build       # 生产构建
npm run build -- --mode mock  # 演示模式构建
```

### 说明

- 管理端（用户管理、CSV 导出、实时看板、多维统计图表）不属于客户端范围，管理员账号
  登录后会看到「请使用管理端 Web」提示。
- 客户端不保存用户密码；JWT 存在 `localStorage`，由后端 `auth_version` 实现改密 /
  角色变更后的令牌失效。
- 时间从后端以 UTC ISO 8601 接收，界面按浏览器本地时区展示。


## 管理端说明

React + TypeScript 管理端覆盖管理员登录/注册、用户与角色管理、课程课堂与学生名单、Emoji 明细与 CSV 导出、实时 WebSocket 看板和多维统计。

### 本地开发

```sh
cd admin-web
npm install
cp .env.example .env
npm run dev
```

默认把 `/api` 代理到 `http://localhost:8000`。若前后端分开部署，将 `VITE_API_BASE_URL` 设置为完整的后端 API 前缀，例如 `https://api.example.edu/api/v1`，并在后端 `CORS_ORIGINS` 中加入管理端来源。

```sh
npm test
npm run build
```

管理员注册需要后端配置的 `ADMIN_INVITE_CODE`。JWT 仅保存在当前浏览器标签会话的 `sessionStorage`，关闭标签后清除；真正的权限边界仍由后端 RBAC 强制执行。


## AI 服务说明

该服务从摄像头、视频文件或 RTSP 流采样画面，在内存中完成人脸检测和情绪分类，将超过阈值的匿名结果写入后端 `/api/v1/ai/emoji-results`。服务不会保存或上传原始帧、人脸截图和视频。

### 推理后端

- `onnx`：默认生产路径。使用 OpenCV Haar 检测人脸，并加载 FER2013 风格 ONNX 分类模型。模型输入应为 `1×1×48×48` 灰度图，输出顺序为 `angry, disgust, fear, happy, sad, surprise, neutral`。
- `fer`：安装 `pip install '.[fer]'` 后可使用 FER 库。
- `mock`：只用于自动化测试和接口演示，必须显式配置 `AI_ALLOW_MOCK=true`，不得用于真实课堂结论。

模型文件不进入代码仓库。部署时应从课程批准的来源取得模型并挂载到容器，记录模型名称、版本、许可证和校验值。

### 运行

```sh
cd ai-service
python -m venv .venv
. .venv/bin/activate
pip install -e '.[dev]'
cp .env.example .env
# 修改后端地址、独立 AI 令牌、课堂 ID、视频源和模型路径
emoji-ai
```

也可用命令行覆盖非敏感参数：

```sh
emoji-ai --session-id <UUID> --source 0 --source-id classroom-camera-01 \
  --backend onnx --model /models/emotion.onnx --threshold 0.60 --sample-interval 2
```

AI 令牌应通过环境变量或秘密管理器注入，避免出现在命令历史。每个采样帧和人脸位置生成确定性事件 ID，网络重试不会制造重复记录；后端的幂等检查仍是最终保障。

### 局限性

表情分类不能可靠代表个人的真实情绪，光照、遮挡、姿态、肤色、文化表达和模型训练数据都会造成偏差。系统仅适合课堂级聚合趋势，不应用于个体评价、考勤、纪律处分或其他高风险决策。默认匿名化；如需改变数据用途或保存媒体，必须另行完成告知、授权和隐私评审。
