import 'dotenv/config'
import { buildApp } from './app.js'
import { runMigrations } from './db/migrate.js'
import { initWebSocket } from './websocket/index.js'
import { logger } from './utils/logger.js'

const PORT = parseInt(process.env['PORT'] ?? '3000', 10)

async function start() {
  try {
    // Run migrations first
    await runMigrations()

    const app = await buildApp()

    // Attach Socket.io to Fastify's underlying HTTP server
    await app.ready()
    initWebSocket(app.server as unknown as import('http').Server)

    await app.listen({ port: PORT, host: '0.0.0.0' })
    logger.info(`Server listening on port ${PORT}`)
  } catch (err) {
    logger.error('Failed to start server', err)
    process.exit(1)
  }
}

void start()
