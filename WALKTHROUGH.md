# WALKTHROUGH.md — 进度追踪

> ⚠️ Agent 上下文切换前必须更新本文件。这是你的记忆锚点。
> 每完成一个任务，立即在对应条目打 ✅，并在"当前状态"更新进度。

---

## 当前状态

**阶段：** 文档完成，准备进入 M1 脚手架搭建
**最后更新：** 2026-04-26
**下一步：** 执行 M1 — 后端骨架初始化

---

## 文档阶段（已完成）

- [x] PLAN.md — 产品需求文档 v0.2
- [x] ARCHITECTURE.md — 系统架构方案 v0.2
- [x] PLAN-IMPL.md — 工程实现计划 v0.2
- [x] CLAUDE.md — 开发规范
- [x] DESIGN.md — 前端 VI 规范（深色极简风）
- [x] WALKTHROUGH.md — 本文件

---

## M1 — 后端骨架（未开始）

**目标：** Node.js + Fastify + Prisma + Socket.io 通路跑通，API 返回 200

- [ ] 初始化 `backend/` 项目（pnpm init + TypeScript + Fastify）
- [ ] 配置 `tsconfig.json`（strict 模式）
- [ ] Prisma 初始化 + SQLite 配置
- [ ] 执行数据库迁移（4 张表：Settings / Task / GeneratedFile / AgentLog）
- [ ] `GET /api/settings`、`PATCH /api/settings` 路由实现
- [ ] `POST /api/tasks`、`GET /api/tasks`、`GET /api/tasks/:id` 路由实现
- [ ] Socket.io 基础配置（连接 / 订阅 taskId / 心跳）
- [ ] `.env.example` + 环境变量加载（dotenv）
- [ ] 统一错误处理中间件（AppError）
- [ ] 验证：`curl http://localhost:3000/api/settings` 返回 200

---

## M1 — 前端骨架（未开始）

**目标：** Vue 3 应用跑起来，4 个页面可路由跳转

- [ ] 初始化 `frontend/` 项目（Vite + Vue 3 + TypeScript）
- [ ] 安装依赖：Pinia / Vue Router / TailwindCSS / Axios / Socket.io-client
- [ ] 安装 shadcn-vue + 深色主题配置
- [ ] 安装 lucide-vue-next
- [ ] `tailwind.config.js` 配置品牌色（参考 DESIGN.md）
- [ ] Vue Router 配置（4 个页面路由）
- [ ] Axios 封装（baseURL / 错误拦截）
- [ ] `useTaskSocket.ts` composable 骨架
- [ ] Pinia store 骨架（task / settings）
- [ ] 4 个页面骨架（能跳转，内容可为空）
- [ ] 验证：`pnpm dev` 启动，4 个路由可访问

---

## M2 — Agent 流水线（未开始）

**目标：** 输入需求，4 个 Agent 顺序执行，生成文件写入数据库

- [ ] `ModelAdapter` 接口定义（`adapters/base.ts`）
- [ ] `OpenAIAdapter` 实现（先用外部模型验证链路）
- [ ] `CatPawAdapter` 实现（确认接口格式后）
- [ ] `ClaudeAdapter` 实现
- [ ] `TaskContext` 类（`agents/context.ts`）
- [ ] `PMAgent` 实现 + Prompt 调试
- [ ] `ArchitectAgent` 实现 + Prompt 调试
- [ ] `EngineerAgent` 实现 + Prompt 调试（逐文件生成）
- [ ] `QAAgent` 实现（简化版）
- [ ] `AgentOrchestrator` 流水线 + WebSocket 事件发射
- [ ] 任务创建 API 接入编排器（异步执行）
- [ ] 生成文件写入 `GeneratedFile` 表
- [ ] 验证：POST 创建任务后，WebSocket 收到 4 个 agent_done 事件，数据库有文件记录

---

## M3 — 前端完整体验（未开始）

**目标：** 用户可以完整操作全流程，流式输出体验正常

- [ ] `TaskNewPage.vue`：需求输入表单 + 技术栈选择 + 提交
- [ ] `AgentProgress.vue`：4 步进度条 + 流式打字输出区域
- [ ] `TaskDetailPage.vue`：执行中视图（进度）/ 结果视图（文件树+代码）切换
- [ ] `FileTree.vue`：递归目录结构组件
- [ ] `CodePreview.vue`：Monaco Editor 集成（只读 + 语法高亮）
- [ ] `HomePage.vue`：历史任务列表
- [ ] `SettingsPage.vue`：模型配置 + GitHub Token 输入
- [ ] `TaskCard.vue`：历史任务卡片组件
- [ ] 验证：完整走通一次，能看到流式输出

---

## M4 — GitHub 推送（未开始）

- [ ] `GitHubService` 实现（createRepo + pushFiles，@octokit/rest）
- [ ] `GET /api/tasks/:id/download` — JSZip 生成 zip
- [ ] `POST /api/tasks/:id/push` — 推送到 GitHub
- [ ] `POST /api/settings/test-github` — 验证 Token 有效性
- [ ] 前端：结果页"下载 zip"和"推送到 GitHub"按钮
- [ ] 验证：点击推送，GitHub 出现新仓库和 commit

---

## M5 — 模型可配置（未开始）

- [ ] 设置页模型选择 UI（provider 下拉 + API Key 输入）
- [ ] Token/Key 加密存储（`utils/crypto.ts`，AES-256）
- [ ] `ModelFactory` 读取设置动态创建 Adapter
- [ ] 验证：切换到 Claude 后重新生成任务，走 Claude 链路

---

## M6 — 联调收尾（未开始）

- [ ] 端到端完整流程测试（3 个不同需求输入）
- [ ] 错误处理验证（断网、Token 失效、模型超时）
- [ ] 性能验证（生成时长 ≤ 3 分钟）
- [ ] README.md 编写（安装、配置、启动说明）

---

## 已知问题 & 待确认

| # | 问题 | 状态 |
|---|------|------|
| Q1 | CatPaw API 格式是否兼容 OpenAI？ | ⏳ 待确认 |
| Q2 | 内部 CatPaw API URL 是什么？ | ⏳ 待确认 |
