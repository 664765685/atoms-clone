# CLAUDE.md — 开发规范

> 所有 Agent 和人工开发必须遵守本文件。这是项目的法律。

## 技术栈

- **前端**：Vue 3 + Vite + Pinia + TailwindCSS v3 + TypeScript
- **后端**：Node.js v20+ + Fastify v4 + TypeScript + Prisma + SQLite + Socket.io
- **包管理**：pnpm（前后端统一）

## 代码规范

### TypeScript
- strict 模式开启，禁止 `any`（确实需要用 `unknown` + 类型守卫）
- 所有公共函数必须有 JSDoc 注释说明参数和返回值
- 使用 `type` 而非 `interface`（除非需要继承/实现）

### 命名
- 文件名：`kebab-case.ts`
- 类：`PascalCase`
- 函数/变量：`camelCase`
- 常量：`UPPER_SNAKE_CASE`
- Vue 组件文件：`PascalCase.vue`

### 错误处理
```typescript
// ✅ 正确
class AppError extends Error {
  constructor(public code: string, message: string, public statusCode = 400) {
    super(message)
  }
}

// 所有 async 函数必须处理错误
try {
  await someOperation()
} catch (err) {
  throw new AppError('OPERATION_FAILED', '操作失败', 500)
}
```

### API 返回格式
```typescript
// 成功
{ "success": true, "data": { ... } }

// 失败
{ "success": false, "error": "错误描述", "code": "ERROR_CODE" }
```

### 环境变量
- 所有配置必须通过 `.env` 注入，不得硬编码任何密钥、URL、端口
- `.env.example` 必须同步更新
- 敏感信息（Token、密码）存库时必须加密

## 目录规范

### 后端 src/
```
routes/       # 路由定义，只做参数校验和调用 service
services/     # 业务逻辑
agents/       # Agent 实现
adapters/     # 模型适配层
db/           # Prisma schema 和 client
websocket/    # Socket.io 事件处理
utils/        # 工具函数
types/        # TypeScript 类型定义
```

### 前端 src/
```
pages/        # 页面组件（路由级别）
components/   # 通用组件
stores/       # Pinia store
api/          # API 调用封装（axios）
types/        # TypeScript 类型定义
utils/        # 工具函数
```

## Git 规范

Conventional Commits：
- `feat:` 新功能
- `fix:` Bug 修复
- `chore:` 工程配置
- `docs:` 文档
- `refactor:` 重构（不改变功能）
- `test:` 测试

## 禁止行为

- ❌ 禁止直接修改 `node_modules`
- ❌ 禁止在代码中 `console.log` 调试信息（用 logger）
- ❌ 禁止 `rm -rf` 不确认
- ❌ 禁止将 `.env` 提交到 Git
- ❌ 禁止明文存储用户 Token 或密码
