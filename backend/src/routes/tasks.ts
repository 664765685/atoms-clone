import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'crypto'
import JSZip from 'jszip'
import { getDb } from '../db/client.js'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import { runPipeline } from '../agents/orchestrator.js'
import type { Task, GeneratedFile, AgentLog } from '../types/index.js'

/**
 * Task routes plugin
 */
export async function taskRoutes(app: FastifyInstance): Promise<void> {
  /**
   * POST /api/tasks
   * Create a new task and trigger the agent pipeline asynchronously
   */
  app.post('/api/tasks', async (req, reply) => {
    const body = req.body as { requirement?: string; techStack?: Record<string, string>; title?: string }
    if (!body.requirement) {
      throw new AppError('BAD_REQUEST', 'requirement is required', 400)
    }

    const id = randomUUID()
    const title = body.title ?? body.requirement.slice(0, 60)
    const techStack = JSON.stringify(body.techStack ?? {})
    const createdAt = new Date().toISOString()

    const db = getDb()
    await db.execute({
      sql: `INSERT INTO Task (id, title, requirement, techStack, status, createdAt) VALUES (?, ?, ?, ?, 'pending', ?)`,
      args: [id, title, body.requirement, techStack, createdAt],
    })

    logger.info('Task created', { id, title })

    // Fire-and-forget: run pipeline asynchronously
    setImmediate(() => {
      runPipeline(id).catch((err: unknown) => {
        logger.error('Pipeline failed', { taskId: id, err })
      })
    })

    const task: Partial<Task> = { id, title, requirement: body.requirement, techStack, status: 'pending', createdAt }
    return reply.status(201).send({ success: true, data: task })
  })

  /**
   * GET /api/tasks
   * List all tasks ordered by creation date descending
   */
  app.get('/api/tasks', async (_req, reply) => {
    const db = getDb()
    const result = await db.execute('SELECT id, title, requirement, techStack, status, errorMsg, githubRepo, githubCommit, createdAt, finishedAt FROM Task ORDER BY createdAt DESC')
    return reply.send({ success: true, data: result.rows })
  })

  /**
   * GET /api/tasks/:id
   * Get task details including agent logs
   */
  app.get('/api/tasks/:id', async (req, reply) => {
    const { id } = req.params as { id: string }
    const db = getDb()

    const taskResult = await db.execute({
      sql: 'SELECT * FROM Task WHERE id = ?',
      args: [id],
    })
    const task = taskResult.rows[0] as unknown as Task | undefined
    if (!task) {
      throw new AppError('NOT_FOUND', 'Task not found', 404)
    }

    const logsResult = await db.execute({
      sql: 'SELECT * FROM AgentLog WHERE taskId = ? ORDER BY createdAt ASC',
      args: [id],
    })

    return reply.send({ success: true, data: { ...task, logs: logsResult.rows } })
  })

  /**
   * GET /api/tasks/:id/files
   * Get all generated files for a task (including content)
   */
  app.get('/api/tasks/:id/files', async (req, reply) => {
    const { id } = req.params as { id: string }
    const db = getDb()

    const taskResult = await db.execute({ sql: 'SELECT id FROM Task WHERE id = ?', args: [id] })
    if (!taskResult.rows[0]) {
      throw new AppError('NOT_FOUND', 'Task not found', 404)
    }

    const filesResult = await db.execute({
      sql: 'SELECT * FROM GeneratedFile WHERE taskId = ? ORDER BY path ASC',
      args: [id],
    })
    return reply.send({ success: true, data: filesResult.rows })
  })

  /**
   * GET /api/tasks/:id/download
   * Download all generated files as a ZIP archive
   */
  app.get('/api/tasks/:id/download', async (req, reply) => {
    const { id } = req.params as { id: string }
    const db = getDb()

    const filesResult = await db.execute({
      sql: 'SELECT * FROM GeneratedFile WHERE taskId = ?',
      args: [id],
    })

    if (filesResult.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'No files found for this task', 404)
    }

    const zip = new JSZip()
    for (const row of filesResult.rows) {
      const file = row as unknown as GeneratedFile
      zip.file(file.path, file.content)
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer' })
    reply.header('Content-Type', 'application/zip')
    reply.header('Content-Disposition', `attachment; filename="task-${id}.zip"`)
    return reply.send(buffer)
  })

  /**
   * POST /api/tasks/:id/push
   * Push generated files to GitHub (placeholder)
   */
  app.post('/api/tasks/:id/push', async (_req, reply) => {
    return reply.send({ success: true, message: 'GitHub push not implemented yet' })
  })
}
