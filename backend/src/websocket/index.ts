import { Server as HttpServer } from 'http'
import { Server as SocketServer, Socket } from 'socket.io'
import { logger } from '../utils/logger.js'
import type { PipelineEvent } from '../types/index.js'

let io: SocketServer | null = null

/**
 * Initialize the Socket.io server attached to the given HTTP server.
 * @param httpServer - The Node.js HTTP server to attach to
 * @returns The Socket.io server instance
 */
export function initWebSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket: Socket) => {
    logger.info('WebSocket client connected', { socketId: socket.id })

    // Client subscribes to updates for a specific task
    socket.on('subscribe', ({ taskId }: { taskId: string }) => {
      void socket.join(`task:${taskId}`)
      logger.info('Client subscribed to task', { socketId: socket.id, taskId })
    })

    socket.on('unsubscribe', ({ taskId }: { taskId: string }) => {
      void socket.leave(`task:${taskId}`)
      logger.info('Client unsubscribed from task', { socketId: socket.id, taskId })
    })

    socket.on('disconnect', () => {
      logger.info('WebSocket client disconnected', { socketId: socket.id })
    })
  })

  logger.info('WebSocket server initialized')
  return io
}

/**
 * Emit a pipeline event to all clients subscribed to the given task.
 * @param event - The pipeline event to emit
 */
export function emitToTask(event: PipelineEvent): void {
  if (!io) {
    logger.warn('WebSocket server not initialized, cannot emit event', { event })
    return
  }
  io.to(`task:${event.taskId}`).emit('pipeline', event)
}

/**
 * Get the Socket.io server instance.
 * @returns The Socket.io server instance or null if not initialized
 */
export function getSocketServer(): SocketServer | null {
  return io
}
