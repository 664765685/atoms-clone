# WALKTHROUGH.md — 项目进度追踪

> 每次 subagent 启动前必须读这个文件，完成后必须更新。
> 防止上下文压缩（Context Compact）后 Agent 不知道做到哪了。

---

## 当前状态

- **当前里程碑：** M4 — GitHub 推送
- **上一个完成：** M3 — 前端完整体验（commit: TBD after push）
- **阻塞：** 无
- **待决策：** 无

---

## 里程碑完成情况

| 里程碑 | 状态 | 完成时间 | 核心交付物 |
|--------|------|----------|----------|
| M1 骨架搭建 | ✅ Done | 2026-04-26 | 后端 Fastify+SQLite+Socket.io，前端 Vue3+Vite+TailwindCSS，4个页面，GitHub 推送 |
| M2 Mock Agent 流水线 | ✅ Done | 2026-04-26 | MockAdapter 流式，4 Agent 顺序流水线，E2E 验证，commit 4dee810 |
| M3 前端完整体验 | ✅ Done | 2026-04-26 | useSocket.ts，FileTree.vue，CodePreview.vue（Monaco loader），TaskDetailPage 完整重写 |
| M4 GitHub 推送 | ⏳ Pending | — | PAT 方式自动创建仓库并推送 |
| M5 真实模型接入 | ⏳ Pending | — | OpenAI/Claude/CatPaw adapter 激活，Settings 页切换 |
| M6 集成打磨 | ⏳ Pending | — | 端到端联调，Bug 修复，UX 细化 |

---

## M3 完成清单（✅ 全部完成）

### 前端
- [x] 接入 Socket.io 客户端（`socket.io-client`，已在 package.json）
- [x] `useSocket.ts` composable — subscribeToTask + cleanup
- [x] `TaskDetailPage.vue` — 运行中状态：4 个 Agent 步骤进度卡片（三态）
- [x] `TaskDetailPage.vue` — 流式输出打字机效果（`agent_chunk` 事件 + `▋` 光标）
- [x] `FileTree.vue` — 文件树组件（支持折叠、目录优先排序）
- [x] `CodePreview.vue` — Monaco Editor via `@monaco-editor/loader`（vs-dark，readOnly）
- [x] `TaskDetailPage.vue` — 结果视图：文件树 + 代码预览 + 下载 zip 按钮
- [x] `pnpm build` 0 error 通过

### 后端
- [x] `/api/tasks/:id/files` 返回 content 字段，与前端对齐（无需修改）

---

## 关键文件索引

```
atoms-clone/
├── backend/
│   ├── src/agents/          # Agent 实现（PM/Architect/Engineer/QA）
│   ├── src/adapters/        # 模型适配器（mock/openai/claude）
│   ├── src/websocket/       # Socket.io，emitToTask()
│   ├── src/routes/          # REST API（tasks/settings）
│   └── src/db/              # SQLite，migrations
├── frontend/
│   ├── src/pages/           # Home/TaskNew/TaskDetail/Settings
│   ├── src/components/      # （待补 FileTree/CodePreview）
│   └── src/stores/          # Pinia stores
├── PLAN.md                  # PRD v0.2
├── ARCHITECTURE.md          # 系统架构 v0.2
├── PLAN-IMPL.md             # 里程碑拆分
├── CLAUDE.md                # 编码规范
├── DESIGN.md                # 前端 VI/UX 规范（新增）
└── WALKTHROUGH.md           # 本文件 — 进度追踪
```

---

## WebSocket 事件协议

| 事件 | 触发时机 | Payload |
|------|----------|---------|
| `agent_start` | Agent 开始执行 | `{ taskId, agent }` |
| `agent_chunk` | Agent 流式输出一个字符 | `{ taskId, agent, chunk }` |
| `agent_done` | Agent 执行完成 | `{ taskId, agent }` |
| `file_created` | 文件写入 DB | `{ taskId, path, language }` |
| `task_done` | 整个流水线完成 | `{ taskId, fileCount }` |
| `task_failed` | 流水线失败 | `{ taskId, error }` |

---

## Agent 流水线架构

```
User Requirement
      ↓
  PM Agent        → 输出: features[]
      ↓
Architect Agent   → 输出: fileManifest[]
      ↓
Engineer Agent    → 输出: generatedFiles[] (每个文件触发 file_created)
      ↓
  QA Agent        → 输出: qaIssues[]
      ↓
  task_done / task_failed
```

---

## 更新记录

| 时间 | 更新内容 |
|------|----------|
| 2026-04-26 09:40 | 初次创建，基于 M2 完成状态 |
| 2026-04-26 09:44 | M3 完成：useSocket.ts / FileTree.vue / CodePreview.vue / TaskDetailPage.vue 完整重写 |
