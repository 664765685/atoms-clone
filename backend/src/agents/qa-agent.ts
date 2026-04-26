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
  // ctx fields used below for context injection

  emitToTask({ type: 'agent_start', taskId, agent: 'qa' })
  logger.info('QA Agent started', { taskId })

  const { requirement, techStack, features, fileManifest } = ctx
  const techStackSummary = `frontend: ${techStack.frontend}, backend: ${techStack.backend}`
  const featureSummary = (features as Array<{ name?: string }>).slice(0, 5).map(f => f.name ?? String(f)).join(' / ') || '(无)'
  const manifestSummary = fileManifest.map(f => f.path).join(', ') || '(无)'
  const generatedPaths = generatedFiles.map(f => f.path).join(', ')

  // Build condensed file snapshots: first 20 lines + size info, not full content
  const PREVIEW_LINES = 20
  const fileSnapshots = generatedFiles.map((f) => {
    const lines = f.content.split('\n')
    const preview = lines.slice(0, PREVIEW_LINES).join('\n')
    const truncated = lines.length > PREVIEW_LINES
    return [
      `### ${f.path} (${f.language}, ${lines.length} lines)`,
      '```',
      preview,
      truncated ? `... (${lines.length - PREVIEW_LINES} more lines omitted)` : '',
      '```',
    ].filter(Boolean).join('\n')
  }).join('\n\n')

  // Stream status text to client
  const streamMessages = [
    {
      role: 'system' as const,
      content: `You are a QA agent — the final step in a 4-agent pipeline (PM → Architect → Engineer → QA).
Your job: review the generated code for quality, correctness, and alignment with the original requirement.
Task context: requirement="${requirement}", tech stack=${techStackSummary}.`,
    },
    {
      role: 'user' as const,
      content: `质量检查: ${generatedFiles.length} 个文件\n[PM确认功能]: ${featureSummary}\n[Architect规划]: ${manifestSummary}\n[Engineer已生成]: ${generatedPaths}`,
    },
  ]

  for await (const chunk of adapter.stream(streamMessages)) {
    emitToTask({ type: 'agent_chunk', taskId, agent: 'qa', chunk })
  }

  // Get structured output
  const completeMessages = [
    {
      role: 'system' as const,
      content: `You are a QA agent — the final step in a 4-agent pipeline (PM → Architect → Engineer → QA).
Your job: review generated files and return a JSON with issues and summary.
Task context: requirement="${requirement}", tech stack: frontend=${techStack.frontend}, backend=${techStack.backend}.`,
    },
    {
      role: 'user' as const,
      content: `对以下生成的文件进行质量审查，结合原始需求「${requirement}」检查是否实现完整，返回 issue 列表 JSON:\n\n--- 上下文摘要 ---\n[PM确认功能]: ${featureSummary}\n[Architect规划文件清单]: ${manifestSummary}\n[Engineer已生成文件]: ${generatedPaths}\n-----------------\n\n--- 文件内容摘要（每个文件前 ${PREVIEW_LINES} 行）---\n${fileSnapshots}`,
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
