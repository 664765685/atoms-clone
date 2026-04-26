import type { FastifyInstance } from 'fastify'
import { Octokit } from '@octokit/rest'
import { getDb } from '../db/client.js'
import { AppError } from '../utils/errors.js'
import { logger } from '../utils/logger.js'
import type { Settings } from '../types/index.js'

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
        hasApiKey: Boolean(row.apiKey && row.apiKey !== ''),
        hasGithubToken: Boolean(row.githubToken && row.githubToken !== ''),
      },
    })
  })

  /**
   * PATCH /api/settings
   * Update settings fields
   */
  app.patch('/api/settings', async (req, reply) => {
    const body = req.body as Partial<Pick<Settings, 'modelProvider' | 'modelName' | 'apiKey' | 'githubToken'>>
    const fields: string[] = []
    const values: unknown[] = []

    if (body.modelProvider !== undefined) { fields.push('modelProvider = ?'); values.push(body.modelProvider) }
    if (body.modelName !== undefined) { fields.push('modelName = ?'); values.push(body.modelName) }
    if (body.apiKey !== undefined) { fields.push('apiKey = ?'); values.push(body.apiKey) }
    if (body.githubToken !== undefined) { fields.push('githubToken = ?'); values.push(body.githubToken) }

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
   * Validates a GitHub Personal Access Token
   */
  app.post('/api/settings/test-github', async (req, reply) => {
    const { token } = req.body as { token?: string }
    if (!token) {
      throw new AppError('BAD_REQUEST', 'token is required', 400)
    }
    try {
      const octokit = new Octokit({ auth: token })
      const { data } = await octokit.users.getAuthenticated()
      return reply.send({ success: true, data: { valid: true, username: data.login } })
    } catch (err) {
      logger.warn('GitHub token validation failed', err)
      return reply.send({ success: true, data: { valid: false, username: null } })
    }
  })
}
