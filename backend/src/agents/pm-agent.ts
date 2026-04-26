import type { ModelAdapter } from '../adapters/base.js'
import type { TaskContext } from './context.js'
import { emitToTask } from '../websocket/index.js'
import { logger } from '../utils/logger.js'

export async function runPMAgent(adapter: ModelAdapter, ctx: TaskContext): Promise<void> {
  const { taskId, requirement, techStack } = ctx

  emitToTask({ type: 'agent_start', taskId, agent: 'pm' })
  logger.info('PM Agent started', { taskId })

  // Stream status text to client
  const streamMessages = [
    { role: 'system' as const, content: 'You are a PM (product manager) agent. Analyze requirements and identify features.' },
    { role: 'user' as const, content: `功能分析: ${requirement}` },
  ]

  for await (const chunk of adapter.stream(streamMessages)) {
    emitToTask({ type: 'agent_chunk', taskId, agent: 'pm', chunk })
  }

  // Get structured output
  const completeMessages = [
    {
      role: 'system' as const,
      content: 'You are a PM (product manager) agent. Return a JSON feature list.',
    },
    {
      role: 'user' as const,
      content: `分析以下需求，返回功能列表 JSON:\n需求: ${requirement}\n技术栈: ${JSON.stringify(techStack)}`,
    },
  ]

  const raw = await adapter.complete(completeMessages)

  try {
    const parsed = JSON.parse(raw) as { features?: unknown[] }
    ctx.features = parsed.features ?? []
    logger.info('PM Agent parsed features', { taskId, count: ctx.features.length })
  } catch (err) {
    logger.warn('PM Agent failed to parse JSON, using empty features', { taskId, err })
    ctx.features = []
  }

  emitToTask({ type: 'agent_done', taskId, agent: 'pm' })
  logger.info('PM Agent done', { taskId })
}
