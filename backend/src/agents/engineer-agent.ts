import type { ModelAdapter } from '../adapters/base.js'
import type { TaskContext, GeneratedFileEntry } from './context.js'
import { emitToTask } from '../websocket/index.js'
import { logger } from '../utils/logger.js'

interface EngineerFileOutput {
  path?: string
  language?: string
  content?: string
}

export async function runEngineerAgent(adapter: ModelAdapter, ctx: TaskContext): Promise<void> {
  const { taskId, requirement, techStack, fileManifest } = ctx

  emitToTask({ type: 'agent_start', taskId, agent: 'engineer' })
  logger.info('Engineer Agent started', { taskId, fileCount: fileManifest.length })

  const techStackSummary = `frontend: ${techStack.frontend}, backend: ${techStack.backend}`
  const fullManifest = fileManifest.map(f => f.path).join(', ')

  for (const fileEntry of fileManifest) {
    logger.info('Engineer Agent generating file', { taskId, path: fileEntry.path })

    // Dynamic context: snapshot of generated vs pending at this moment
    const alreadyGenerated = ctx.generatedFiles.map(f => f.path).join(', ') || '(首个文件，无前置依赖)'
    const remaining = fileManifest
      .filter(f => !ctx.generatedFiles.find(g => g.path === f.path) && f.path !== fileEntry.path)
      .map(f => f.path).join(', ') || '(无，这是最后一个文件)'

    // Stream generation progress for this file
    const streamMessages = [
      {
        role: 'system' as const,
        content: `You are an Engineer agent — step 3 in a 4-agent pipeline (PM → Architect → Engineer → QA).
Your job: implement the code files designed by the Architect.
Task context: requirement="${requirement}", tech stack=${techStackSummary}.`,
      },
      {
        role: 'user' as const,
        content: `生成文件: ${fileEntry.path}\n[已生成]: ${alreadyGenerated}\n[当前任务]: ${fileEntry.path}\n[待生成]: ${remaining}`,
      },
    ]

    for await (const chunk of adapter.stream(streamMessages)) {
      emitToTask({ type: 'agent_chunk', taskId, agent: 'engineer', chunk })
    }

    // Generate the actual file content
    const completeMessages = [
      {
        role: 'system' as const,
        content: `You are an Engineer agent — step 3 in a 4-agent pipeline (PM → Architect → Engineer → QA).
Your job: implement the specified file and return a JSON with path, language, and content.
Task context: requirement="${requirement}", tech stack: frontend=${techStack.frontend}, backend=${techStack.backend}.`,
      },
      {
        role: 'user' as const,
        content: `实现以下文件，返回 JSON:\n文件路径: ${fileEntry.path}\n文件用途: ${fileEntry.purpose}\n需求: ${requirement}\n技术栈: ${JSON.stringify(techStack)}\n\n--- 上下文摘要 ---\n[Architect规划全部文件]: ${fullManifest}\n[已生成]: ${alreadyGenerated}\n[当前任务]: ${fileEntry.path}\n[待生成]: ${remaining}\n-----------------`,
      },
    ]

    const raw = await adapter.complete(completeMessages)

    try {
      const parsed = JSON.parse(raw) as EngineerFileOutput
      const generatedFile: GeneratedFileEntry = {
        path: parsed.path ?? fileEntry.path,
        language: parsed.language ?? detectLanguage(fileEntry.path),
        content: parsed.content ?? `// Generated: ${fileEntry.path}\n`,
      }
      ctx.generatedFiles.push(generatedFile)

      emitToTask({ type: 'file_created', taskId, path: generatedFile.path })
      logger.info('Engineer Agent file generated', { taskId, path: generatedFile.path })
    } catch (err) {
      logger.warn('Engineer Agent failed to parse file JSON, using placeholder', {
        taskId,
        path: fileEntry.path,
        err,
      })
      const fallback: GeneratedFileEntry = {
        path: fileEntry.path,
        language: detectLanguage(fileEntry.path),
        content: `// Generated: ${fileEntry.path}\n// Purpose: ${fileEntry.purpose}\n`,
      }
      ctx.generatedFiles.push(fallback)
      emitToTask({ type: 'file_created', taskId, path: fallback.path })
    }
  }

  emitToTask({ type: 'agent_done', taskId, agent: 'engineer' })
  logger.info('Engineer Agent done', { taskId, filesGenerated: ctx.generatedFiles.length })
}

function detectLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() ?? ''
  const map: Record<string, string> = {
    ts: 'typescript',
    tsx: 'typescript',
    js: 'javascript',
    jsx: 'javascript',
    vue: 'vue',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    md: 'markdown',
    json: 'json',
    css: 'css',
    html: 'html',
    sh: 'shell',
    yaml: 'yaml',
    yml: 'yaml',
  }
  return map[ext] ?? 'plaintext'
}
