import type { FastifyInstance } from 'fastify'
import { getDb } from '../db/client.js'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import type { Settings } from '../types/index.js'

/** GitHub user API response (partial) */
type GitHubUser = {
  login: string
}

/**
 * Settings routes plugin
 */
export async function settingsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /api/settings
   * Returns current settings with sensitive fields masked
   */
  app.get('/api/settings', async (_req, reply) => {
    const db = getDb()
    const result = await db.execute('SELECT * FROM Settings WHERE id = 1')
    const row = result.rows[0] as unknown as Settings | undefined
    if (!row) {
      throw new AppError('NOT_FOUND', 'Settings not found', 404)
    }
    return reply.send({
      success: true,
      data: {
        modelProvider: row.modelProvider,
        modelName: row.modelName,
        modelBaseUrl: row.modelBaseUrl ?? '',
        hasApiKey: Boolean(row.apiKey && row.apiKey !== ''),
        hasModelApiKey: Boolean(row.modelApiKey && row.modelApiKey !== ''),
        hasGithubToken: Boolean(row.githubToken && row.githubToken !== ''),
        githubUsername: row.githubUsername ?? '',
      },
    })
  })

  /**
   * PATCH /api/settings
   * Update settings fields
   */
  app.patch('/api/settings', async (req, reply) => {
    const body = req.body as Partial<Pick<Settings, 'modelProvider' | 'modelName' | 'apiKey' | 'modelApiKey' | 'modelBaseUrl' | 'githubToken' | 'githubUsername'>>
    const fields: string[] = []
    const values: unknown[] = []

    if (body.modelProvider !== undefined) { fields.push('modelProvider = ?'); values.push(body.modelProvider) }
    if (body.modelName !== undefined) { fields.push('modelName = ?'); values.push(body.modelName) }
    if (body.apiKey !== undefined) { fields.push('apiKey = ?'); values.push(body.apiKey) }
    if (body.modelApiKey !== undefined) { fields.push('modelApiKey = ?'); values.push(body.modelApiKey) }
    if (body.modelBaseUrl !== undefined) { fields.push('modelBaseUrl = ?'); values.push(body.modelBaseUrl) }
    if (body.githubToken !== undefined) { fields.push('githubToken = ?'); values.push(body.githubToken) }
    if (body.githubUsername !== undefined) { fields.push('githubUsername = ?'); values.push(body.githubUsername) }

    if (fields.length === 0) {
      throw new AppError('BAD_REQUEST', 'No fields to update', 400)
    }

    values.push(1) // WHERE id = 1
    const db = getDb()
    await db.execute({ sql: `UPDATE Settings SET ${fields.join(', ')} WHERE id = 1`, args: values as (string | number | null)[] })

    logger.info('Settings updated', { fields: Object.keys(body) })
    return reply.send({ success: true })
  })

  /**
   * POST /api/settings/test-github
   * Validates a GitHub Personal Access Token using the native fetch API
   */
  app.post('/api/settings/test-github', async (req, reply) => {
    const { token } = req.body as { token?: string }
    if (!token) {
      throw new AppError('BAD_REQUEST', 'token is required', 400)
    }
    try {
      const resp = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'User-Agent': 'atoms-clone/1.0',
        },
      })
      if (!resp.ok) {
        return reply.send({ success: true, data: { valid: false, username: null } })
      }
      const user = await resp.json() as GitHubUser
      return reply.send({ success: true, data: { valid: true, username: user.login } })
    } catch (err) {
      logger.warn('GitHub token validation failed', err)
      return reply.send({ success: true, data: { valid: false, username: null } })
    }
  })
}
