# 管理端

React + TypeScript 管理端覆盖管理员登录/注册、用户与角色管理、课程课堂与学生名单、Emoji 明细与 CSV 导出、实时 WebSocket 看板和多维统计。

## 本地开发

```sh
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
