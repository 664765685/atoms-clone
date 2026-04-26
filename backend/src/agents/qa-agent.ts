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

  // Phase 1: review each file individually with full content
  const fileIssues: QAIssue[] = []
  for (const file of generatedFiles) {
    logger.info('QA Agent reviewing file', { taskId, path: file.path })

    const fileCompleteMessages = [
      {
        role: 'system' as const,
        content: `You are a QA agent — the final step in a 4-agent pipeline (PM → Architect → Engineer → QA).
Your job: review a single file for quality, correctness, and alignment with the original requirement.
Task context: requirement="${requirement}", tech stack: frontend=${techStack.frontend}, backend=${techStack.backend}.
Project file manifest: ${manifestSummary}.`,
      },
      {
        role: 'user' as const,
        content: `审查以下文件，返回 JSON { issues: [{severity, file, description}] }，无问题则返回 { issues: [] }:\n\n### ${file.path} (${file.language})\n\`\`\`${file.language}\n${file.content}\n\`\`\`\n\n需求: ${requirement}`,
      },
    ]

    try {
      const raw = await adapter.complete(fileCompleteMessages)
      const parsed = JSON.parse(raw) as QAOutput
      if (parsed.issues?.length) {
        fileIssues.push(...parsed.issues)
      }
    } catch (err) {
      logger.warn('QA Agent failed to parse file review JSON', { taskId, path: file.path, err })
    }
  }

  // Phase 2: aggregate all file issues into a final summary
  const aggregateMessages = [
    {
      role: 'system' as const,
      content: `You are a QA agent — the final step in a 4-agent pipeline (PM → Architect → Engineer → QA).
Your job: aggregate per-file review results into a final quality report.
Task context: requirement="${requirement}", tech stack=${techStackSummary}.`,
    },
    {
      role: 'user' as const,
      content: `汇总以下逐文件审查结果，返回最终 JSON { issues: [{severity, file, description}], summary: string }:\n\n--- 上下文摘要 ---\n[PM确认功能]: ${featureSummary}\n[Engineer已生成文件]: ${generatedPaths}\n-----------------\n\n逐文件 issue 清单:\n${JSON.stringify(fileIssues, null, 2)}`,
    },
  ]

  const raw = await adapter.complete(aggregateMessages)

  try {
    const parsed = JSON.parse(raw) as QAOutput
    ctx.qaIssues = parsed.issues ?? fileIssues  // fallback to per-file issues if aggregate fails

    if (parsed.summary) {
      emitToTask({ type: 'agent_chunk', taskId, agent: 'qa', chunk: parsed.summary })
    }

    logger.info('QA Agent parsed issues', { taskId, issueCount: ctx.qaIssues.length })
  } catch (err) {
    logger.warn('QA Agent failed to parse aggregate JSON, using per-file issues', { taskId, err })
    ctx.qaIssues = fileIssues
  }

  emitToTask({ type: 'agent_done', taskId, agent: 'qa' })
  logger.info('QA Agent done', { taskId })
}
