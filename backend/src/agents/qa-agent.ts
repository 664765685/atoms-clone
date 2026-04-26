import type { ModelAdapter } from '../adapters/base.js'
import type { TaskContext, QAIssue } from './context.js'
import { emitToTask } from '../websocket/index.js'
import { logger } from '../utils/logger.js'

interface QAOutput {
  issues?: QAIssue[]
  summary?: string
}

export async function runQAAgent(adapter: ModelAdapter, ctx: TaskContext): Promise<void> {
  const { taskId, generatedFiles } = ctx

  emitToTask({ type: 'agent_start', taskId, agent: 'qa' })
  logger.info('QA Agent started', { taskId })

  // Stream status text to client
  const streamMessages = [
    { role: 'system' as const, content: 'You are a QA agent. Review code quality and find issues.' },
    { role: 'user' as const, content: `质量检查: ${generatedFiles.length} 个文件` },
  ]

  for await (const chunk of adapter.stream(streamMessages)) {
    emitToTask({ type: 'agent_chunk', taskId, agent: 'qa', chunk })
  }

  // Get structured output
  const fileList = generatedFiles.map((f) => `${f.path} (${f.language})`).join('\n')
  const completeMessages = [
    {
      role: 'system' as const,
      content: 'You are a QA agent. Review generated files and return a JSON with issues and summary.',
    },
    {
      role: 'user' as const,
      content: `对以下生成的文件进行质量检查，返回 issue 列表 JSON:\n${fileList}`,
    },
  ]

  const raw = await adapter.complete(completeMessages)

  try {
    const parsed = JSON.parse(raw) as QAOutput
    ctx.qaIssues = parsed.issues ?? []

    // Emit each issue as a chunk
    if (parsed.summary) {
      emitToTask({ type: 'agent_chunk', taskId, agent: 'qa', chunk: parsed.summary })
    }

    logger.info('QA Agent parsed issues', { taskId, issueCount: ctx.qaIssues.length })
  } catch (err) {
    logger.warn('QA Agent failed to parse JSON, using empty issues', { taskId, err })
    ctx.qaIssues = []
  }

  emitToTask({ type: 'agent_done', taskId, agent: 'qa' })
  logger.info('QA Agent done', { taskId })
}
