import type { FastifyInstance } from 'fastify'
import { randomUUID } from 'crypto'
import JSZip from 'jszip'
import { getDb } from '../db/client.js'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import { runPipeline } from '../agents/orchestrator.js'
import type { Task, GeneratedFile, AgentLog, Settings } from '../types/index.js'

// ─── GitHub REST API types ──────────────────────────────────

/** GitHub repo creation response (partial) */
type GitHubRepo = {
  html_url: string
  full_name: string
}

/** GitHub file content PUT response (partial) */
type GitHubContentResponse = {
  commit: {
    sha: string
    html_url: string
  }
}

/** GitHub API error response */
type GitHubErrorBody = {
  message?: string
}

/**
 * Call GitHub REST API with a PAT token.
 * Throws AppError on non-2xx responses (except 422 when `ignore422` is true).
 */
async function githubRequest<T>(
  method: string,
  path: string,
  token: string,
  body?: Record<string, unknown>,
  ignore422 = false,
): Promise<T | null> {
  const resp = await fetch(`https://api.github.com${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'atoms-clone/1.0',
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (resp.ok) {
    return resp.json() as Promise<T>
  }

  if (ignore422 && resp.status === 422) {
    return null
  }

  let msg = `GitHub API error: ${resp.status} ${resp.statusText}`
  try {
    const errBody = await resp.json() as GitHubErrorBody
    if (errBody.message) msg = `GitHub API error: ${errBody.message}`
  } catch {
    // ignore parse error
  }
  throw new AppError('GITHUB_ERROR', msg, 502)
}

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
   * Push generated files to the user's GitHub repository via GitHub REST API.
   * Creates the repo if it doesn't exist, then uploads each file using the
   * Contents API (base64-encoded). Idempotent: 422 (repo already exists) is ignored.
   */
  app.post('/api/tasks/:id/push', async (req, reply) => {
    const { id } = req.params as { id: string }
    const db = getDb()

    // 1. Load settings
    const settingsResult = await db.execute('SELECT * FROM Settings WHERE id = 1')
    const settings = settingsResult.rows[0] as unknown as Settings | undefined
    if (!settings) {
      throw new AppError('NOT_FOUND', 'Settings not found', 404)
    }

    const { githubToken, githubUsername } = settings
    if (!githubToken) {
      throw new AppError('BAD_REQUEST', 'GitHub token not configured', 400)
    }
    if (!githubUsername) {
      throw new AppError('BAD_REQUEST', 'GitHub username not configured', 400)
    }

    // 2. Load task + generated files
    const taskResult = await db.execute({ sql: 'SELECT * FROM Task WHERE id = ?', args: [id] })
    const task = taskResult.rows[0] as unknown as Task | undefined
    if (!task) {
      throw new AppError('NOT_FOUND', 'Task not found', 404)
    }

    const filesResult = await db.execute({
      sql: 'SELECT * FROM GeneratedFile WHERE taskId = ? ORDER BY path ASC',
      args: [id],
    })
    const files = filesResult.rows as unknown as GeneratedFile[]
    if (files.length === 0) {
      throw new AppError('BAD_REQUEST', 'No generated files to push', 400)
    }

    // 3. Derive repo name from task ID
    const repoName = `agent-gen-${id.slice(0, 8)}`
    const owner = githubUsername

    // 4. Create repository (ignore 422 = already exists → idempotent)
    await githubRequest<GitHubRepo>(
      'POST',
      '/user/repos',
      githubToken,
      { name: repoName, private: false, description: `Generated by atoms-clone: ${task.title}` },
      true, // ignore 422
    )

    logger.info('GitHub repo ensured', { owner, repoName })

    // 5. Upload each file via Contents API
    let firstCommitSha: string | null = null
    let firstCommitUrl: string | null = null

    for (const file of files) {
      // base64-encode file content
      const contentBase64 = Buffer.from(file.content, 'utf-8').toString('base64')

      // Check if file already exists (to get its SHA for update)
      let existingSha: string | undefined
      try {
        const existingResp = await fetch(
          `https://api.github.com/repos/${owner}/${repoName}/contents/${file.path}`,
          {
            headers: {
              Authorization: `Bearer ${githubToken}`,
              Accept: 'application/vnd.github+json',
              'X-GitHub-Api-Version': '2022-11-28',
              'User-Agent': 'atoms-clone/1.0',
            },
          },
        )
        if (existingResp.ok) {
          const existing = await existingResp.json() as { sha: string }
          existingSha = existing.sha
        }
      } catch {
        // ignore — file just doesn't exist yet
      }

      const putBody: Record<string, unknown> = {
        message: `feat: add ${file.path}`,
        content: contentBase64,
      }
      if (existingSha) {
        putBody['sha'] = existingSha
      }

      const result = await githubRequest<GitHubContentResponse>(
        'PUT',
        `/repos/${owner}/${repoName}/contents/${file.path}`,
        githubToken,
        putBody,
      )

      if (result && firstCommitSha === null) {
        firstCommitSha = result.commit.sha
        firstCommitUrl = result.commit.html_url
      }

      logger.info('File pushed to GitHub', { path: file.path, repoName })
    }

    // 6. Update task record with repo info
    const repoUrl = `https://github.com/${owner}/${repoName}`
    const commitUrl = firstCommitUrl ?? `${repoUrl}/commits`

    await db.execute({
      sql: 'UPDATE Task SET githubRepo = ?, githubCommit = ? WHERE id = ?',
      args: [repoUrl, firstCommitSha, id],
    })

    logger.info('GitHub push complete', { taskId: id, repoUrl, commitSha: firstCommitSha })

    return reply.send({ success: true, data: { repoUrl, commitUrl } })
  })
}
