import type { ModelAdapter } from '../adapters/base.js'
import type { TaskContext, FileManifestEntry } from './context.js'
import { emitToTask } from '../websocket/index.js'
import { logger } from '../utils/logger.js'

interface ArchitectOutput {
  fileManifest?: FileManifestEntry[]
  dataModels?: string
  apiDesign?: string
  notes?: string
}

export async function runArchitectAgent(adapter: ModelAdapter, ctx: TaskContext): Promise<void> {
  const { taskId, requirement, techStack, features } = ctx

  emitToTask({ type: 'agent_start', taskId, agent: 'architect' })
  logger.info('Architect Agent started', { taskId })

  const techStackSummary = `frontend: ${techStack.frontend}, backend: ${techStack.backend}`
  const featureSummary = features.length > 0
    ? (features as Array<{ name?: string }>).slice(0, 5).map(f => f.name ?? String(f)).join(' / ')
    : '(待PM分析)'

  // Stream status text to client
  const streamMessages = [
    {
      role: 'system' as const,
      content: `You are an Architect agent — step 2 in a 4-agent pipeline (PM → Architect → Engineer → QA).
Your job: design the system architecture and produce a file manifest.
Task context: requirement="${requirement}", tech stack=${techStackSummary}.`,
    },
    {
      role: 'user' as const,
      content: `架构设计: ${requirement}\n[PM已确认功能]: ${featureSummary}`,
    },
  ]

  for await (const chunk of adapter.stream(streamMessages)) {
    emitToTask({ type: 'agent_chunk', taskId, agent: 'architect', chunk })
  }

  // Get structured output
  const completeMessages = [
    {
      role: 'system' as const,
      content: `You are an Architect agent — step 2 in a 4-agent pipeline (PM → Architect → Engineer → QA).
Your job: design the system architecture and return a JSON file manifest.
Task context: requirement="${requirement}", tech stack: frontend=${techStack.frontend}, backend=${techStack.backend}.`,
    },
    {
      role: 'user' as const,
      content: `设计系统架构，返回文件清单 JSON:\n需求: ${requirement}\n技术栈: ${JSON.stringify(techStack)}\n\n--- 上下文摘要 ---\n[PM已确认功能]: ${featureSummary}\n-----------------\n\n请基于以上功能列表设计文件清单。`,
    },
  ]

  const raw = await adapter.complete(completeMessages)

  try {
    const parsed = JSON.parse(raw) as ArchitectOutput
    ctx.fileManifest = parsed.fileManifest ?? []
    logger.info('Architect Agent parsed file manifest', { taskId, count: ctx.fileManifest.length })
  } catch (err) {
    logger.warn('Architect Agent failed to parse JSON, using empty manifest', { taskId, err })
    ctx.fileManifest = []
  }

  emitToTask({ type: 'agent_done', taskId, agent: 'architect' })
  logger.info('Architect Agent done', { taskId })
}
