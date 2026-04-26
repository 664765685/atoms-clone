# DESIGN.md — 前端 VI 规范

> 版本：v0.1 · 日期：2026-04-26
> ⚠️ 所有前端 Agent 必须严格遵守本文件。禁止硬编码颜色值和间距。

---

## 一、设计风格

**深色极简风** — 参考 Linear / GitHub Copilot / Vercel 暗色主题

核心原则：
- 背景深暗，内容区用层次感区分，而非用线框
- 大量留白，文字密度克制
- 强调色单一（蓝紫色系），不堆砌颜色
- 动画轻量、过渡自然（150-200ms）

---

## 二、色彩系统

使用 TailwindCSS CSS 变量，全部在 `tailwind.config.js` 中定义，**禁止在组件内直接写颜色值**。

### 背景色层次

```
bg-base       #0d0d0f   最底层背景（页面背景）
bg-surface    #16161a   卡片/面板背景
bg-elevated   #1e1e24   悬浮层/弹窗背景
bg-overlay    #26262e   hover 状态背景
```

### 文字色

```
text-primary    #f0f0f5   主要文字（标题、正文）
text-secondary  #8b8b9e   次要文字（描述、标签）
text-muted      #52525e   弱化文字（时间戳、占位符）
text-disabled   #3a3a46   禁用状态
```

### 强调色（品牌色）

```
accent          #7c6af7   主强调色（按钮、链接、激活态）
accent-hover    #6b5ae6   hover 状态
accent-light    #7c6af720 透明强调色（背景高亮）
```

### 状态色

```
success   #34d399   绿色（完成、成功）
warning   #fbbf24   黄色（警告）
error     #f87171   红色（失败、错误）
info      #60a5fa   蓝色（信息提示）
```

### 边框色

```
border-subtle   #1e1e24   极淡边框（卡片分隔）
border-default  #2a2a35   默认边框
border-strong   #3a3a48   强调边框（focus 状态）
```

### Tailwind 配置

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        base: '#0d0d0f',
        surface: '#16161a',
        elevated: '#1e1e24',
        overlay: '#26262e',
        accent: {
          DEFAULT: '#7c6af7',
          hover: '#6b5ae6',
          light: '#7c6af720',
        },
        border: {
          subtle: '#1e1e24',
          default: '#2a2a35',
          strong: '#3a3a48',
        }
      }
    }
  }
}
```

---

## 三、字体系统

```css
/* 字体栈 */
font-family: 'Inter', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;

/* 代码字体 */
font-family-mono: 'JetBrains Mono', 'Fira Code', 'Menlo', monospace;
```

### 字号规范

| 用途 | 类名 | 大小 | 行高 |
|------|------|------|------|
| 页面大标题 | `text-2xl font-semibold` | 24px | 32px |
| 区块标题 | `text-lg font-medium` | 18px | 28px |
| 正文 | `text-sm` | 14px | 22px |
| 辅助文字 | `text-xs` | 12px | 18px |
| 代码 | `text-sm font-mono` | 13px | 20px |

---

## 四、间距规范

使用 TailwindCSS 标准间距，**禁止任意值**（如 `p-[13px]`）。

```
卡片内边距：     p-4（16px）或 p-6（24px）
区块间距：       space-y-4 / gap-4
页面内容最大宽：  max-w-6xl mx-auto px-6
侧边栏宽度：     w-64（256px）
```

---

## 五、组件库

使用 **shadcn-vue**（基于 Radix Vue + TailwindCSS），在此基础上定制深色主题。

```bash
# 安装
pnpm dlx shadcn-vue@latest init
```

选择配置：
- Style: Default
- Base color: Slate
- CSS variables: Yes

### 核心组件使用规范

**Button**
```vue
<!-- 主按钮 -->
<Button variant="default">开始生成</Button>

<!-- 次要按钮 -->
<Button variant="outline">取消</Button>

<!-- 危险操作 -->
<Button variant="destructive">删除</Button>

<!-- 幽灵按钮（工具栏用）-->
<Button variant="ghost" size="sm">查看</Button>
```

**Card**
```vue
<Card class="bg-surface border-border-default">
  <CardHeader>
    <CardTitle class="text-primary">任务标题</CardTitle>
    <CardDescription class="text-secondary">描述信息</CardDescription>
  </CardHeader>
  <CardContent>...</CardContent>
</Card>
```

**Badge（状态标签）**
```vue
<!-- 执行中 -->
<Badge class="bg-accent-light text-accent border-0">Running</Badge>

<!-- 完成 -->
<Badge class="bg-success/20 text-success border-0">Done</Badge>

<!-- 失败 -->
<Badge class="bg-error/20 text-error border-0">Failed</Badge>
```

---

## 六、图标

使用 **Lucide Vue Next**（线性图标，与深色极简风一致）。

```bash
pnpm add lucide-vue-next
```

```vue
<script setup>
import { Play, Settings, Download, Github, ChevronRight } from 'lucide-vue-next'
</script>

<template>
  <Play :size="16" class="text-secondary" />
</template>
```

图标尺寸规范：
- 工具栏/按钮内：`:size="16"`
- 独立图标：`:size="20"`
- 大图标（空状态）：`:size="40"`

---

## 七、核心页面布局规范

### 整体布局

```
┌─────────────────────────────────────────┐
│  Topbar（高度 56px，bg-surface）          │
├──────────┬──────────────────────────────┤
│ Sidebar  │  Main Content               │
│ w-64     │  max-w-6xl mx-auto px-6     │
│ bg-base  │  bg-base                    │
│          │                             │
└──────────┴──────────────────────────────┘
```

### 任务执行页（核心页面）布局

```
┌─────────────────────────────────────────────────┐
│ Topbar                                           │
├──────────────────────────────────────────────────┤
│  Agent 进度条（4步，横向，顶部固定）                │
├────────────────────┬────────────────────────────┤
│  左侧：Agent 输出   │  右侧：文件树 + 代码预览     │
│  流式打字区域       │  (执行完成后展示)            │
│  bg-surface        │  bg-surface                │
│  flex-1            │  w-[420px]                 │
└────────────────────┴────────────────────────────┘
```

---

## 八、动效规范

```css
/* 统一过渡时长 */
transition-duration: 150ms（hover 状态）
transition-duration: 200ms（展开/收起）
transition-duration: 300ms（页面切换）

/* 缓动函数 */
transition-timing-function: ease-out
```

TailwindCSS 使用：
```
transition-colors duration-150   // 颜色过渡
transition-all duration-200       // 尺寸/位置过渡
```

---

## 九、禁止行为

- ❌ 禁止硬编码颜色值（如 `style="color: #fff"`）
- ❌ 禁止使用 TailwindCSS 任意值（如 `text-[15px]`、`mt-[7px]`）
- ❌ 禁止混用多种图标库
- ❌ 禁止在 dark 模式和 light 模式之间切换——本项目只有深色主题
- ❌ 禁止使用内联 `style` 属性定义视觉样式（逻辑计算的动态样式除外）
