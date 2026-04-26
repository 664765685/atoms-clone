# PLAN-IMPL.md — 工程实现计划

> 版本：v0.2 · 日期：2026-04-26

---

## 一、里程碑规划

| 里程碑 | 目标 | 预估工时 |
|--------|------|---------|
| **M1** 骨架可运行 | 前后端项目初始化，API / WebSocket 通路跑通 | 1-2 天 |
| **M2** Agent 流水线 | 4 个 Agent 顺序跑通，能生成代码文件 | 2-3 天 |
| **M3** 前端完整体验 | 流式输出、文件树、代码预览全部接入 | 1-2 天 |
| **M4** GitHub 推送 | 自动创建仓库 + 推送代码 | 1 天 |
| **M5** 模型可配置 | 设置页切换模型，支持 CatPaw / Claude / GPT | 1 天 |
| **M6** 联调 + 收尾 | 端到端走通、bug 修复、体验打磨 | 1-2 天 |
| **合计** | | **7-11 天** |

---

## 二、M1 任务拆分 — 骨架

### 后端
- [ ] 初始化 Node.js + TypeScript + Fastify 项目（`backend/`）
- [ ] 配置 `tsconfig.json`（strict 模式）
- [ ] Prisma 初始化 + SQLite 配置
- [ ] 执行数据库迁移（Settings / Task / GeneratedFile / AgentLog 四张表）
- [ ] 实现基础 REST API：`POST /api/tasks`、`GET /api/tasks`、`GET /api/tasks/:id`
- [ ] 实现设置 API：`GET/PATCH /api/settings`
- [ ] Socket.io 配置：连接 / 订阅 taskId / 测试推送
- [ ] `.env.example` + 环境变量加载
- [ ] 统一错误处理中间件

### 前端
- [ ] 初始化 Vue 3 + Vite + Pinia + TailwindCSS + TypeScript（`frontend/`）
- [ ] Vue Router 配置（4 个页面路由）
- [ ] Axios 封装（baseURL / 错误拦截）
- [ ] Socket.io-client 基础封装（`useTaskSocket.ts`）
- [ ] Pinia store 骨架（task store / settings store）
- [ ] 4 个页面组件骨架（空壳，能路由跳转）

### 工程
- [ ] `package.json` 根目录，配置 `dev` 脚本同时启动前后端

---

## 三、M2 任务拆分 — Agent 流水线

- [ ] `ModelAdapter` 接口定义（`base.ts`）
- [ ] `OpenAIAdapter` 实现（最先调通，用于验证）
- [ ] `CatPawAdapter` 实现（确认接口格式后实现）
- [ ] `ClaudeAdapter` 实现
- [ ] `TaskContext` 类实现
- [ ] `PMAgent` 实现 + Prompt 调试（输出 JSON 功能列表）
- [ ] `ArchitectAgent` 实现 + Prompt 调试（输出文件清单 + 架构）
- [ ] `EngineerAgent` 实现 + Prompt 调试（最复杂，逐文件生成）
- [ ] `QAAgent` 实现（简化版，输出问题清单）
- [ ] `AgentOrchestrator` 编排：流水线 + 事件发射
- [ ] 任务创建 API 接入编排器（异步执行 + WebSocket 推送）
- [ ] 生成文件写入数据库

---

## 四、M3 任务拆分 — 前端体验

- [ ] `AgentProgress.vue`：步骤进度条 + 流式输出展示
- [ ] `FileTree.vue`：文件树组件（递归目录结构）
- [ ] `CodePreview.vue`：Monaco Editor 集成（只读 + 语法高亮）
- [ ] `TaskNewPage.vue`：需求输入表单 + 技术栈选择 + 提交
- [ ] `TaskDetailPage.vue`：执行中视图 / 结果视图（状态切换）
- [ ] `HomePage.vue`：历史任务列表
- [ ] `SettingsPage.vue`：模型配置表单 + GitHub Token 输入

---

## 五、M4-M5 任务拆分

### M4 GitHub 推送
- [ ] `GitHubService` 实现（createRepo + pushFiles）
- [ ] `POST /api/tasks/:id/push` 接口
- [ ] `GET /api/tasks/:id/download` 接口（JSZip 生成 zip）
- [ ] 前端：结果页"推送到 GitHub"和"下载 zip"按钮

### M5 模型可配置
- [ ] 设置页模型选择 UI（下拉选择 provider + 输入 API Key）
- [ ] API Key 加密存储（`crypto.ts`）
- [ ] `ModelFactory` 读取设置动态创建 Adapter
- [ ] 测试 GitHub Token 有效性接口

---

## 六、开发规范

详见 `CLAUDE.md`，核心：

1. TypeScript Strict 模式，禁止 `any`
2. API 统一返回格式：`{ success, data?, error? }`
3. 所有敏感信息（Token/Key）加密存储，禁止明文
4. 环境变量走 `.env`，禁止硬编码
5. Git Commit 使用 Conventional Commits

---

## 七、本地开发环境

```bash
# 依赖：Node.js v20+，pnpm

# 安装依赖
cd backend && pnpm install
cd frontend && pnpm install

# 初始化数据库
cd backend && pnpm prisma migrate dev

# 启动（开发模式，热重载）
cd backend && pnpm dev     # :3000
cd frontend && pnpm dev    # :5173

# 或根目录一键启动（M1 完成后配置）
pnpm dev
```

所需环境变量（`.env`）：
```
PORT=3000
DATABASE_URL="file:./dev.db"
ENCRYPTION_KEY=<32位随机字符串>
CATPAW_API_URL=<内部 CatPaw 接口地址>
```
