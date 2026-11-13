# Worklog

## 2026-11-13

- 阅读实验指导书、仓库 README、API 契约、后端路由与测试；确认后端已实现管理端和 AI 集成所需 REST/WebSocket 契约。
- 在服务器 `codex/admin-ai-integration` 分支新增 React + TypeScript 管理端，覆盖管理员认证、用户管理、课程与课堂、学生名单、Emoji 查询与 CSV 导出、实时看板和多维统计。
- 新增 Python AI 推理服务，支持 OpenCV ONNX/FER 推理适配、置信度过滤、匿名幂等事件、后端重试和显式测试 mock；默认不保存或上传媒体。
- 补充管理端与 AI 服务测试、运行说明、容器入口和根 README。验证结果在完成服务器安装、测试与构建后补记。
- 修正 OpenCV DNN 的 ONNX 输入调用；事件 ID 纳入采集时间，避免服务重启后帧号复用造成碰撞；移除未使用的 onnxruntime 依赖。
- 管理端改为按需注册 ECharts 柱状图、折线图、饼图及必要组件，生产主 JS 从约 1.426 MB 降至 852.24 kB。Vite 仍提示单块超过 500 kB，不影响构建成功。
- 修正无完整会话认证数据时登录页与受保护路由之间的重定向循环，并补充 ONNX 输入调用回归测试。
- 在 Slurm 作业 `157128` 的 `anode19` 计算节点、`emoji-checker` tmux 会话中完成最终验证：管理端 Vitest 3/3 通过，生产构建成功，AI 服务 Pytest 7/7 通过。
