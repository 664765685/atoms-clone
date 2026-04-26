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

  // Stream status text to client
  const streamMessages = [
    { role: 'system' as const, content: 'You are an architect agent. Design architecture and file manifest.' },
    { role: 'user' as const, content: `架构设计: ${requirement}` },
  ]

  for await (const chunk of adapter.stream(streamMessages)) {
    emitToTask({ type: 'agent_chunk', taskId, agent: 'architect', chunk })
  }

  // Get structured output
  const completeMessages = [
    {
      role: 'system' as const,
      content: 'You are an architect agent. Return a JSON with file manifest and architecture details. Design the file manifest carefully.',
    },
    {
      role: 'user' as const,
      content: `设计系统架构，返回文件清单 JSON:\n需求: ${requirement}\n技术栈: ${JSON.stringify(techStack)}\n功能列表: ${JSON.stringify(features)}`,
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
