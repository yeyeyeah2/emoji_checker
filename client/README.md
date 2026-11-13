# Emoji Checker 客户端

表情符号课堂情绪检查器的浏览器客户端，覆盖实验指导书「客户端」必做功能：

- 学生：注册、登录、修改密码、选择进行中的课堂提交 Emoji、查看个人历史
- 教师：登录、查看所授课堂的历史 Emoji、按课程 / 班级 / 时段做基础统计
- 通用：JWT 登录态、角色路由守卫、401 自动退出、分页与筛选、响应式布局

## 技术栈

- React 19 + TypeScript + Vite 6
- React Router 7
- 原生 CSS（无 UI 框架）
- Vitest（纯函数单元测试）

## 架构（MVVM）

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

## 运行

### 1. 连接真实后端（默认）

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

### 2. 演示模式（无需后端 / 数据库）

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

## 已实现功能

### 学生端

- 注册：可选学生 / 教师身份；用户名、邮箱、密码（≥12 位）前后端双重校验
- 登录：用户名或邮箱 + 密码；错误统一提示
- 修改密码：成功后旧 JWT 立即失效，自动回到登录页
- 情绪打卡：只展示「进行中」的课堂；选中课堂后可提交 6 种 Emoji
- 个人历史：按课程 / 情绪 / 来源 / 时间筛选，分页展示；提交成功后自动刷新
- 即将开始的课堂提示（时间、班级、课程）

### 教师端

- 统计概览：时间范围、课程、分组维度（情绪 / 来源 / 班级 / 课程 / 课堂 / 课程+班级）、
  小时 / 天分桶
- KPI：总记录、人工记录、AI 记录、去重学生数
- 分布图：按记录数排序的水平条形图（单一蓝色序列、直接数值标签、悬停提示、表格视图）
- 历史记录：按课程 / 课堂 / 情绪 / 来源 / 时间筛选，分页
- 选中具体课堂后调用课堂名单接口，把 `user_id` 映射为学生用户名
- 教师数据范围由后端限制为本人所授课程

### 通用

- 角色路由守卫：学生 / 教师访问对方页面时自动跳回本人首页
- JWT 有效期默认 30 分钟；任何请求返回 401 都会清除本地令牌并回到登录页
- 响应式：桌面双栏、移动端单栏；移动端历史记录自动变为键值卡片
- 无障碍：表单 label、`aria-checked` / `aria-pressed` / `aria-live`、键盘焦点样式、
  图表表格视图与逐条 `aria-label`
- `prefers-reduced-motion` 下关闭动画

## 使用的后端接口

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

## 质量检查

```bash
npm run typecheck   # TypeScript 严格模式
npm test            # Vitest：28 个用例
npm run build       # 生产构建
npm run build -- --mode mock  # 演示模式构建
```

## 说明

- 管理端（用户管理、CSV 导出、实时看板、多维统计图表）不属于客户端范围，管理员账号
  登录后会看到「请使用管理端 Web」提示。
- 客户端不保存用户密码；JWT 存在 `localStorage`，由后端 `auth_version` 实现改密 /
  角色变更后的令牌失效。
- 时间从后端以 UTC ISO 8601 接收，界面按浏览器本地时区展示。
