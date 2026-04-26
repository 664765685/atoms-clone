import type { ChatMessage, ModelAdapter } from './base.js'

const PM_RESPONSE = JSON.stringify({
  features: [
    {
      id: 'F1',
      name: '用户认证',
      description: '用户注册/登录/登出',
      priority: 'mvp',
      userStories: ['As a user, I want to register an account'],
    },
    {
      id: 'F2',
      name: '任务管理',
      description: '创建/查看/删除任务',
      priority: 'mvp',
      userStories: ['As a user, I want to create a task'],
    },
    {
      id: 'F3',
      name: '数据展示',
      description: '列表和详情页',
      priority: 'mvp',
      userStories: ['As a user, I want to see task details'],
    },
  ],
})

const ARCHITECT_RESPONSE = JSON.stringify({
  fileManifest: [
    { path: 'src/App.vue', purpose: '根组件，路由出口' },
    { path: 'src/pages/HomePage.vue', purpose: '首页' },
    { path: 'src/api/index.ts', purpose: 'Axios 封装' },
    { path: 'backend/src/app.ts', purpose: 'Fastify 应用入口' },
    { path: 'backend/src/routes/tasks.ts', purpose: '任务路由' },
  ],
  dataModels: 'CREATE TABLE tasks (id TEXT PRIMARY KEY, title TEXT, status TEXT);',
  apiDesign: 'POST /api/tasks, GET /api/tasks, GET /api/tasks/:id',
  notes: '前后端分离，Vue3 + Fastify',
})

const ENGINEER_FILES: Record<string, { language: string; content: string }> = {
  'src/App.vue': {
    language: 'vue',
    content:
      '<template>\n  <router-view />\n</template>\n\n<script setup lang="ts">\n// 根组件\n</script>',
  },
  'src/pages/HomePage.vue': {
    language: 'vue',
    content:
      '<template>\n  <div class="home">\n    <h1>Todo 应用</h1>\n    <TaskList />\n  </div>\n</template>\n\n<script setup lang="ts">\nimport TaskList from \'../components/TaskList.vue\'\n</script>',
  },
  'src/api/index.ts': {
    language: 'typescript',
    content:
      "import axios from 'axios'\n\nconst api = axios.create({\n  baseURL: '/api',\n  timeout: 10000,\n})\n\nexport default api",
  },
  'backend/src/app.ts': {
    language: 'typescript',
    content:
      "import Fastify from 'fastify'\n\nconst app = Fastify({ logger: true })\n\nexport default app",
  },
  'backend/src/routes/tasks.ts': {
    language: 'typescript',
    content:
      "import type { FastifyInstance } from 'fastify'\n\nexport async function taskRoutes(app: FastifyInstance) {\n  app.get('/api/tasks', async () => ({ tasks: [] }))\n}",
  },
}

const QA_RESPONSE = JSON.stringify({
  issues: [
    {
      severity: 'warning',
      file: 'src/api/index.ts',
      description: '建议添加请求超时配置',
    },
  ],
  summary: '发现 0 个 error，1 个 warning',
})

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function detectAgentType(messages: ChatMessage[]): 'pm' | 'architect' | 'engineer' | 'qa' | 'unknown' {
  const systemMsg = messages.find((m) => m.role === 'system')?.content ?? ''
  const combined = systemMsg.toLowerCase()

  // Use system message role hint for reliable detection (check most specific first)
  if (combined.includes('qa') || combined.includes('quality') || combined.includes('review')) {
    return 'qa'
  }
  if (combined.includes('engineer') || combined.includes('implement')) {
    return 'engineer'
  }
  if (combined.includes('architect') || combined.includes('architecture') || combined.includes('file manifest')) {
    return 'architect'
  }
  if (combined.includes('pm') || combined.includes('product')) {
    return 'pm'
  }
  return 'unknown'
}

export class MockAdapter implements ModelAdapter {
  async complete(messages: ChatMessage[]): Promise<string> {
    // Simulate a small delay
    await sleep(200)

    const agentType = detectAgentType(messages)

    // For engineer agent, check if a specific file path is mentioned
    if (agentType === 'engineer') {
      const userMsg = messages.find((m) => m.role === 'user')?.content ?? ''
      // Try to find which file to generate based on the path mentioned in user message
      for (const [filePath, fileData] of Object.entries(ENGINEER_FILES)) {
        if (userMsg.includes(filePath)) {
          return JSON.stringify({ path: filePath, language: fileData.language, content: fileData.content })
        }
      }
      // Default to first file
      const firstEntry = Object.entries(ENGINEER_FILES)[0]
      return JSON.stringify({ path: firstEntry[0], language: firstEntry[1].language, content: firstEntry[1].content })
    }

    switch (agentType) {
      case 'pm':
        return PM_RESPONSE
      case 'architect':
        return ARCHITECT_RESPONSE
      case 'qa':
        return QA_RESPONSE
      default:
        return JSON.stringify({ message: 'Mock response' })
    }
  }

  async *stream(messages: ChatMessage[]): AsyncGenerator<string> {
    const agentType = detectAgentType(messages)

    let text: string
    switch (agentType) {
      case 'pm':
        text = '正在分析需求，识别功能模块...'
        break
      case 'architect':
        text = '正在设计系统架构，规划文件结构...'
        break
      case 'engineer':
        text = '正在生成代码，请稍候...'
        break
      case 'qa':
        text = '正在执行质量检查，扫描潜在问题...'
        break
      default:
        text = '正在处理中...'
    }

    for (const char of text) {
      yield char
      await sleep(10 + Math.random() * 10)
    }
  }
}
