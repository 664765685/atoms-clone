import Fastify from 'fastify'
import cors from '@fastify/cors'
import { createServer } from 'http'
import { runMigrations } from './db/migrate.js'
import { initWebSocket } from './websocket/index.js'
import { settingsRoutes } from './routes/settings.js'
import { taskRoutes } from './routes/tasks.js'
import { isAppError, formatError } from './utils/errors.js'
import { logger } from './utils/logger.js'

/**
 * Build and configure the Fastify application.
 */
export async function buildApp() {
  const app = Fastify({ logger: false })

  // CORS
  await app.register(cors, { origin: '*' })

  // Body parser (built-in in Fastify v4+)
  // Routes
  await app.register(settingsRoutes)
  await app.register(taskRoutes)

  // Global error handler
  app.setErrorHandler((err, _req, reply) => {
    if (isAppError(err)) {
      logger.warn('App error', { code: err.code, message: err.message })
      return reply.status(err.statusCode).send({ success: false, ...formatError(err) })
    }
    logger.error('Unexpected error', { err })
    return reply.status(500).send({ success: false, ...formatError(err) })
  })

  // Run DB migrations
  await runMigrations()

  return app
}

/**
 * Create HTTP server with Socket.io attached.
 */
export async function createAppServer() {
  const app = await buildApp()

  // Get underlying Node HTTP server
  await app.ready()
  const httpServer = createServer(app.server ? undefined : undefined)

  // Attach Socket.io to Fastify's HTTP server
  initWebSocket(app.server as unknown as import('http').Server)

  return app
}
