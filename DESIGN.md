# DESIGN.md — 前端 VI/UX 规范

> 所有前端 Agent 必须读这个文件，严格遵守以下规范，禁止硬编码颜色/间距/字号。

---

## 设计原则

1. **Token 化** — 所有颜色/间距/字号只允许使用 Tailwind 工具类，禁止 `style="color: #xxx"` 硬编码
2. **暗色优先** — 全局深色主题，`bg-gray-950` 作为最底层背景
3. **信息密度适中** — 代码类产品，用户需要同时看多块信息，不做过度留白
4. **状态可见** — 所有异步操作（生成中/推送中）必须有明确的视觉反馈
5. **无"AI 味儿"** — 不用霓虹渐变、不用奇怪的 emoji 装饰、不用花哨动画

---

## 色彩系统（Tailwind 类名映射）

| 语义 | Tailwind 类 | 用途 |
|------|------------|------|
| 页面背景 | `bg-gray-950` | 最外层容器 |
| 卡片背景 | `bg-gray-900` | 卡片/面板 |
| 边框 | `border-gray-800` | 分割线、卡片边框 |
| 主文字 | `text-gray-100` | 标题、主内容 |
| 次要文字 | `text-gray-400` | 标签、说明、时间戳 |
| 占位文字 | `text-gray-600` | placeholder |
| 主色调 | `text-violet-400` / `bg-violet-600` | 主按钮、高亮、选中态 |
| 成功 | `text-emerald-400` | done 状态、成功提示 |
| 警告 | `text-yellow-400` | 警告、QA issue |
| 错误 | `text-red-400` | failed 状态、错误提示 |
| 运行中 | `text-blue-400` | running 状态、流式输出光标 |
| Agent PM | `text-violet-400` | PM Agent 标识色 |
| Agent Architect | `text-blue-400` | Architect Agent 标识色 |
| Agent Engineer | `text-emerald-400` | Engineer Agent 标识色 |
| Agent QA | `text-yellow-400` | QA Agent 标识色 |

---

## 间距系统

- 页面最大宽度：`max-w-7xl mx-auto px-6`
- 卡片内边距：`p-6`
- 元素间间距：`gap-4`（同级），`gap-6`（段落间）
- 小标签间距：`gap-2`

---

## 字体规范

| 层级 | Tailwind 类 |
|------|------------|
| 页面标题 | `text-2xl font-semibold text-gray-100` |
| 卡片标题 | `text-lg font-medium text-gray-200` |
| 正文 | `text-sm text-gray-300` |
| 代码/路径 | `font-mono text-sm text-gray-300` |
| 标签/徽章 | `text-xs font-medium` |

代码区域必须使用 `font-mono`（Monaco Editor 用 `fontFamily: 'JetBrains Mono, Fira Code, monospace'`）。

---

## 组件规范

### 按钮

```html
<!-- 主按钮 -->
<button class="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors">
  提交
</button>

<!-- 次要按钮 -->
<button class="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors">
  取消
</button>

<!-- 危险按钮 -->
<button class="px-4 py-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 text-sm font-medium rounded-lg border border-red-800 transition-colors">
  删除
</button>
```

### 状态徽章

```html
<!-- pending -->
<span class="px-2 py-0.5 text-xs font-medium rounded bg-gray-800 text-gray-400">Pending</span>
<!-- running -->
<span class="px-2 py-0.5 text-xs font-medium rounded bg-blue-900/40 text-blue-400">Running</span>
<!-- done -->
<span class="px-2 py-0.5 text-xs font-medium rounded bg-emerald-900/40 text-emerald-400">Done</span>
<!-- failed -->
<span class="px-2 py-0.5 text-xs font-medium rounded bg-red-900/40 text-red-400">Failed</span>
```

### Agent 步骤进度条

每个 Agent 一个步骤卡片，三种状态：等待 / 进行中 / 完成

```html
<!-- 进行中 -->
<div class="flex items-start gap-3 p-4 rounded-lg bg-blue-950/30 border border-blue-800/50">
  <div class="w-2 h-2 mt-2 rounded-full bg-blue-400 animate-pulse"></div>
  <div>
    <div class="text-sm font-medium text-blue-400">PM Agent</div>
    <div class="text-xs text-gray-400 mt-0.5">分析需求，拆解功能列表...</div>
  </div>
</div>
```

### 文件树节点

```html
<div class="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-gray-800 cursor-pointer group">
  <svg class="w-4 h-4 text-gray-500 group-hover:text-gray-300 flex-shrink-0">...</svg>
  <span class="font-mono text-sm text-gray-300 truncate">src/App.vue</span>
</div>
```

### 流式输出区域

```html
<div class="font-mono text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
  {{ streamContent }}<span class="animate-pulse text-blue-400">▋</span>
</div>
```

---

## Monaco Editor 配置

```typescript
const monacoOptions = {
  theme: 'vs-dark',
  fontSize: 13,
  fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
  lineNumbers: 'on',
  minimap: { enabled: false },
  scrollBeyondLastLine: false,
  readOnly: true,
  padding: { top: 16, bottom: 16 },
  renderLineHighlight: 'none',
}
```

---

## 布局结构（TaskDetailPage）

```
┌─────────────────────────────────────────────────┐
│ Header: 任务标题 + 状态徽章 + 操作按钮            │
├──────────────────────┬──────────────────────────┤
│ 左栏 (40%)           │ 右栏 (60%)               │
│                      │                          │
│ Agent 步骤进度        │ 代码预览区               │
│ ─────────────        │ (Monaco Editor)          │
│ ① PM Agent ✓        │                          │
│ ② Architect ✓       │                          │
│ ③ Engineer 🔄       │                          │
│   └ 流式输出区       │                          │
│ ④ QA Agent ⏳        │                          │
│                      │                          │
│ ─────────────        │                          │
│ 文件树（完成后）      │                          │
│ └ src/               │                          │
│   └ App.vue          │                          │
└──────────────────────┴──────────────────────────┘
```

---

## 禁止清单

- ❌ 禁止 `style="color: ..."` 硬编码颜色
- ❌ 禁止随意引入新的 UI 组件库（已有 TailwindCSS 够用）
- ❌ 禁止霓虹渐变（`from-pink-500 to-violet-500` 这种）
- ❌ 禁止大量 emoji 装饰（仅状态图标可用，不超过 1 个/行）
- ❌ 禁止 `!important`
- ❌ 禁止在组件内写 `<style>` 块（除非 scoped 且必要）
