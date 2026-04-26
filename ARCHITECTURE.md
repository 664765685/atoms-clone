# ARCHITECTURE.md — AI Multi-Agent 代码生成平台 · 架构方案

> 版本：v0.2 · 状态：待 Review · 日期：2026-04-26
> ⚠️ 这是架构师文档，所有工程决策必须对齐此文档。

---

## 一、系统架构总览

```
┌──────────────────────────────────────────────────────────────┐
│                        用户浏览器                              │
│               Vue 3 + Vite + Pinia + TailwindCSS              │
│                                                               │
│  [首页/历史]  [创建任务]  [执行/结果页]  [设置页]               │
│                    ↑ Monaco Editor / 文件树                    │
└───────────────────────┬──────────────────────────────────────┘
                        │ HTTP REST + WebSocket
┌───────────────────────▼──────────────────────────────────────┐
│                    API Server                                  │
│               Node.js v20 + Fastify v4 + TypeScript           │
│                                                               │
│  REST API (任务 CRUD / 设置 / 文件)                            │
│  WebSocket  (Agent 执行进度实时推送)                            │
└────┬──────────────────┬──────────────────┬────────────────────┘
     │                  │                  │
     ▼                  ▼                  ▼
┌─────────┐    ┌─────────────────┐  ┌─────────────────┐
│  SQLite │    │ Agent Orchestrat│  │  GitHub Service  │
│  (任务/ │    │ or (流水线编排) │  │  (代码推送)      │
│  文件/  │    │                 │  └─────────────────┘
│  设置)  │    │ PM → Arch →     │
└─────────┘    │ Eng → QA        │
               └────────┬────────┘
                        │
               ┌────────▼────────┐
               │  Model Adapter  │
               │  (可配置模型层)  │
               │                 │
               │ - CatPaw (内部) │
               │ - Claude API    │
               │ - OpenAI API    │
               └─────────────────┘
```

### 关键设计决策

1. **SQLite 替代 PostgreSQL**：MVP 单用户无需多实例，SQLite 零配置，无需 Docker，降低部署门槛
2. **无用户认证**：单用户模式，所有设置（模型配置、GitHub Token）本地持久化到 SQLite
3. **WebSocket 实时推送**：Agent 流式输出通过 Socket.io 推送到前端，实现打字机效果
4. **模型适配层**：统一接口，业务代码不感知底层模型，切换只需改配置

---

## 二、技术选型

### 前端

| 技术 | 版本 | 说明 |
|------|------|------|
| Vue 3 | latest | Composition API |
| Vite | latest | 构建工具 |
| Pinia | latest | 状态管理 |
| TailwindCSS | v3 | 样式 |
| Monaco Editor | latest | 代码预览，VSCode 同款 |
| Socket.io-client | v4 | 接收 Agent 实时输出 |
| Axios | latest | HTTP 请求 |
| Vue Router | v4 | 路由 |

### 后端

| 技术 | 版本 | 说明 |
|------|------|------|
| Node.js | v20 LTS | 运行时 |
| Fastify | v4 | HTTP 框架，性能优于 Express |
| TypeScript | v5 | 类型安全 |
| Socket.io | v4 | WebSocket 封装 |
| Prisma | latest | ORM + 迁移管理 |
| SQLite | - | 数据库（via Prisma） |
| JSZip | latest | 生成 zip 下载 |
| @octokit/rest | latest | GitHub API 客户端 |

### 无需 Docker / Redis

MVP 阶段：
- 数据库：SQLite（文件型，零配置）
- 任务队列：直接异步执行（无队列）
- 部署：`node dist/server.js` 直接启动

---

## 三、核心模块设计

### 3.1 Agent Orchestrator（流水线编排）

```typescript
// 执行事件类型
type PipelineEvent =
  | { type: 'agent_start';  agent: AgentRole }
  | { type: 'agent_chunk';  agent: AgentRole; chunk: string }   // 流式内容
  | { type: 'agent_done';   agent: AgentRole; result: unknown }
  | { type: 'file_created'; path: string }
  | { type: 'task_done';    files: GeneratedFile[] }
  | { type: 'task_failed';  error: string }

// 编排入口
async function* runPipeline(task: Task): AsyncGenerator<PipelineEvent> {
  const ctx = new TaskContext(task)

  // 顺序执行 4 个 Agent
  for (const agent of [pmAgent, architectAgent, engineerAgent, qaAgent]) {
    yield { type: 'agent_start', agent: agent.role }
    for await (const event of agent.run(ctx)) {
      ctx.absorb(event)   // 将产物写入上下文
      yield event
    }
    yield { type: 'agent_done', agent: agent.role, result: ctx.getResult(agent.role) }
  }

  yield { type: 'task_done', files: ctx.files }
}
```

### 3.2 Model Adapter（模型适配层）

```typescript
// 统一接口
interface ModelAdapter {
  // 流式输出
  stream(messages: ChatMessage[]): AsyncGenerator<string>
  // 非流式（用于需要 JSON 解析的场景）
  complete(messages: ChatMessage[]): Promise<string>
}

// 三种实现
class CatPawAdapter    implements ModelAdapter { ... }
class ClaudeAdapter    implements ModelAdapter { ... }
class OpenAIAdapter    implements ModelAdapter { ... }

// 工厂（读取设置表中的配置）
function createAdapter(config: ModelConfig): ModelAdapter {
  switch (config.provider) {
    case 'catpaw':  return new CatPawAdapter(config)
    case 'claude':  return new ClaudeAdapter(config)
    case 'openai':  return new OpenAIAdapter(config)
  }
}
```

### 3.3 TaskContext（执行上下文）

```typescript
class TaskContext {
  // 输入
  requirement: string       // 用户需求描述
  techStack: TechStack      // 技术栈选择

  // PM Agent 产物
  features: Feature[]       // 功能列表
  userStories: UserStory[]  // 用户故事

  // Architect Agent 产物
  architecture: string      // 架构描述（Markdown）
  dbSchema: string          // SQL DDL
  apiSpec: string           // OpenAPI JSON
  fileManifest: string[]    // 待生成文件路径清单

  // Engineer Agent 产物
  files: GeneratedFile[]    // { path, content, language }

  // QA Agent 产物
  qaIssues: QAIssue[]       // 问题清单
}
```

### 3.4 GitHub Service

```typescript
class GitHubService {
  constructor(private token: string) {}

  // 创建新仓库（以项目名命名）
  async createRepo(name: string, description: string): Promise<{ owner: string; repo: string; url: string }>

  // 批量推送文件（一个 commit，含所有生成文件）
  async pushFiles(
    owner: string,
    repo: string,
    files: GeneratedFile[],
    commitMessage: string
  ): Promise<{ commitUrl: string }>
}
```

---

## 四、数据库设计（SQLite / Prisma）

```prisma
// schema.prisma

model Settings {
  id           Int     @id @default(1)       // 单行配置
  modelProvider String  @default("catpaw")   // catpaw | claude | openai
  modelName     String  @default("catclaw-proxy-model")
  apiKey        String  @default("")          // 外部模型 API Key（加密存储）
  githubToken   String  @default("")          // GitHub PAT（加密存储）
}

model Task {
  id          String   @id @default(cuid())
  title       String                          // 自动从需求截取前 30 字
  requirement String                          // 用户原始需求
  techStack   String                          // JSON: { frontend, backend }
  status      String   @default("pending")   // pending | running | done | failed
  errorMsg    String?
  githubRepo  String?                         // 推送后的仓库 URL
  githubCommit String?
  createdAt   DateTime @default(now())
  finishedAt  DateTime?
  files       GeneratedFile[]
  logs        AgentLog[]
}

model GeneratedFile {
  id       String @id @default(cuid())
  taskId   String
  task     Task   @relation(fields: [taskId], references: [id])
  path     String                             // 相对路径，如 src/App.vue
  content  String
  language String
}

model AgentLog {
  id        String   @id @default(cuid())
  taskId    String
  task      Task     @relation(fields: [taskId], references: [id])
  agentRole String                            // pm | architect | engineer | qa
  content   String                            // 该 Agent 的完整输出（累积）
  createdAt DateTime @default(now())
}
```

---

## 五、API 设计

### REST API

```
# 任务
POST   /api/tasks                创建任务（触发 Agent 流水线）
GET    /api/tasks                任务列表（按创建时间倒序）
GET    /api/tasks/:id            任务详情（含 Agent 日志）
GET    /api/tasks/:id/files      文件列表
GET    /api/tasks/:id/files/*    获取单个文件内容（路径用 * 匹配）
GET    /api/tasks/:id/download   下载 zip 压缩包
POST   /api/tasks/:id/push       推送到 GitHub

# 设置
GET    /api/settings             获取当前设置
PATCH  /api/settings             更新设置（模型配置 / GitHub Token）
POST   /api/settings/test-github 测试 GitHub Token 是否有效
```

### WebSocket 事件

客户端连接后订阅指定任务：
```javascript
socket.emit('subscribe', { taskId: 'xxx' })
```

服务端推送：
```javascript
// Agent 开始执行
{ type: 'agent_start',  taskId, agent: 'pm' | 'architect' | 'engineer' | 'qa' }

// Agent 流式输出（每次一小块）
{ type: 'agent_chunk',  taskId, agent, chunk: '...' }

// Agent 执行完成
{ type: 'agent_done',   taskId, agent }

// 单个文件生成完成
{ type: 'file_created', taskId, path: 'src/App.vue' }

// 整个任务完成
{ type: 'task_done',    taskId, fileCount: 12 }

// 任务失败
{ type: 'task_failed',  taskId, error: '...' }
```

---

## 六、Agent Prompt 设计

### PM Agent（输出 JSON）

```
System:
你是一个资深产品经理。用户会给你一个产品需求，你的任务是分析并结构化输出。

要求：
- 提炼 5-10 个核心功能点，每个功能附带 1-2 条用户故事
- 区分 MVP 必须和 P1/P2 迭代
- 输出严格 JSON，不要包含任何额外文字

输出格式：
{
  "features": [
    {
      "id": "F1",
      "name": "功能名称",
      "description": "功能描述",
      "priority": "mvp" | "p1" | "p2",
      "userStories": ["As a user, I want to...", "..."]
    }
  ]
}

User:
技术栈：{techStack}
需求描述：{requirement}
```

### Architect Agent（输出 JSON）

```
System:
你是一个经验丰富的全栈架构师。基于功能列表，设计技术方案。

要求：
- 列出需要生成的所有文件（路径 + 作用说明）
- 设计核心数据结构
- 定义关键 API 接口
- 技术栈已确定，不要推荐其他技术
- MVP 原则：够用就好，不要过度设计

输出格式：
{
  "fileManifest": [{ "path": "src/App.vue", "purpose": "..." }],
  "dataModels": "...",   // SQL DDL 或 JSON Schema
  "apiDesign": "...",    // 主要接口描述
  "notes": "..."         // 架构说明
}

User:
技术栈：{techStack}
功能列表：{features}
```

### Engineer Agent（逐文件生成）

```
System:
你是一个经验丰富的全栈工程师，代码洁癖，注重可维护性。
每次只生成一个文件，代码必须完整可运行。

要求：
- 代码完整，不要省略任何部分，不要写 "// ... rest of code"
- 遵循技术栈最佳实践
- 添加必要注释，关键逻辑说明清楚
- 输出严格 JSON

输出格式：
{
  "path": "src/components/TaskCreator.vue",
  "language": "vue",
  "content": "完整代码内容"
}

User:
技术栈：{techStack}
架构方案：{architecture}
已生成文件列表：{generatedFiles}  // 避免重复，保持一致性
当前需要生成：{targetFile} — {filePurpose}
```

### QA Agent（输出问题清单）

```
System:
你是一个前端/后端测试工程师。检查代码并输出问题清单。

检查维度：
1. 文件引用：import 的模块是否都已生成
2. API 调用：前端调用的接口是否和后端定义一致
3. 语法错误：明显的语法问题
4. 安全问题：未验证的用户输入、敏感信息硬编码

输出格式：
{
  "issues": [
    {
      "severity": "error" | "warning",
      "file": "src/api/tasks.ts",
      "description": "调用了 /api/tasks/:id/cancel 接口，但后端未定义该路由"
    }
  ],
  "summary": "发现 X 个 error，Y 个 warning"
}

User:
文件清单：{fileManifest}
代码文件：{files}
```

---

## 七、项目目录结构

```
atoms-clone/
├── frontend/                        # Vue 3 前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── AgentProgress.vue    # Agent 执行进度 + 流式输出
│   │   │   ├── FileTree.vue         # 文件树组件
│   │   │   ├── CodePreview.vue      # Monaco 代码预览
│   │   │   └── TaskCard.vue         # 历史任务卡片
│   │   ├── pages/
│   │   │   ├── HomePage.vue         # 首页 + 历史任务列表
│   │   │   ├── TaskNewPage.vue      # 创建任务
│   │   │   ├── TaskDetailPage.vue   # 执行中 / 结果页（同路由）
│   │   │   └── SettingsPage.vue     # 设置页
│   │   ├── stores/
│   │   │   ├── task.ts              # 任务状态管理
│   │   │   └── settings.ts          # 设置状态管理
│   │   ├── api/
│   │   │   ├── tasks.ts             # 任务相关 API
│   │   │   └── settings.ts          # 设置相关 API
│   │   ├── composables/
│   │   │   └── useTaskSocket.ts     # WebSocket 封装
│   │   ├── types/
│   │   │   └── index.ts             # 共享类型定义
│   │   ├── router/
│   │   │   └── index.ts
│   │   ├── App.vue
│   │   └── main.ts
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                         # Node.js 后端
│   ├── src/
│   │   ├── routes/
│   │   │   ├── tasks.ts             # 任务路由
│   │   │   └── settings.ts          # 设置路由
│   │   ├── agents/
│   │   │   ├── orchestrator.ts      # 流水线编排（核心）
│   │   │   ├── context.ts           # TaskContext 定义
│   │   │   ├── pm-agent.ts
│   │   │   ├── architect-agent.ts
│   │   │   ├── engineer-agent.ts
│   │   │   └── qa-agent.ts
│   │   ├── adapters/
│   │   │   ├── base.ts              # ModelAdapter 接口
│   │   │   ├── catpaw.ts
│   │   │   ├── claude.ts
│   │   │   └── openai.ts
│   │   ├── services/
│   │   │   ├── github.ts            # GitHub API 推送
│   │   │   └── zip.ts               # zip 下载生成
│   │   ├── db/
│   │   │   ├── schema.prisma
│   │   │   └── client.ts            # Prisma client 单例
│   │   ├── websocket/
│   │   │   └── index.ts             # Socket.io 事件处理
│   │   ├── utils/
│   │   │   └── crypto.ts            # Token 加密/解密
│   │   └── app.ts                   # Fastify 应用初始化
│   ├── package.json
│   └── tsconfig.json
│
├── PLAN.md                          # 产品需求文档（本文件）
├── ARCHITECTURE.md                  # 架构方案（本文件）
├── PLAN-IMPL.md                     # 工程实现计划
└── CLAUDE.md                        # 开发规范
```

---

## 八、技术风险 & 应对

| 风险 | 概率 | 影响 | 应对 |
|------|------|------|------|
| CatPaw API 格式不兼容 OpenAI | 中 | 高 | 单独实现 CatPawAdapter，先用外部模型调通链路 |
| Engineer Agent 生成文件不完整 | 高 | 中 | Prompt 强调"代码必须完整"，QA Agent 检查，用户可下载后自行修复 |
| 单次生成 Token 超限 | 中 | 高 | 限制文件数量（MVP ≤ 15 个文件），超出时提示用户精简需求 |
| 流式输出 WebSocket 断连 | 低 | 中 | 断连后可通过 REST API 轮询任务状态补偿 |
