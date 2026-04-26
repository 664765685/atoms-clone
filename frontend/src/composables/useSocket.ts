import { io, Socket } from 'socket.io-client'
import type { AgentRole } from '../types'

const BACKEND_URL = 'http://localhost:3000'

/** Socket.io 事件 handlers 类型 */
export type TaskSocketHandlers = {
  /** Agent 开始执行 */
  onAgentStart?: (payload: { taskId: string; agent: AgentRole }) => void
  /** Agent 流式输出块 */
  onAgentChunk?: (payload: { taskId: string; agent: AgentRole; chunk: string }) => void
  /** Agent 执行完成 */
  onAgentDone?: (payload: { taskId: string; agent: AgentRole }) => void
  /** 文件创建 */
  onFileCreated?: (payload: { taskId: string; path: string; language: string }) => void
  /** 整个任务完成 */
  onTaskDone?: (payload: { taskId: string; fileCount: number }) => void
  /** 任务失败 */
  onTaskFailed?: (payload: { taskId: string; error: string }) => void
}

/** Pipeline 事件结构（与后端一致） */
type PipelineSocketEvent =
  | { type: 'agent_start'; taskId: string; agent: AgentRole }
  | { type: 'agent_chunk'; taskId: string; agent: AgentRole; chunk: string }
  | { type: 'agent_done'; taskId: string; agent: AgentRole }
  | { type: 'file_created'; taskId: string; path: string; language: string }
  | { type: 'task_done'; taskId: string; fileCount: number }
  | { type: 'task_failed'; taskId: string; error: string }

/** cleanup 函数类型 */
export type SocketCleanup = () => void

/** 全局 Socket 实例（复用） */
let globalSocket: Socket | null = null

/**
 * 获取或创建全局 Socket 实例
 */
function getSocket(): Socket {
  if (!globalSocket || !globalSocket.connected) {
    globalSocket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    })
  }
  return globalSocket
}

/**
 * useSocket composable — 订阅指定任务的 Agent 执行事件
 *
 * 用法：
 * ```ts
 * const cleanup = subscribeToTask(taskId, {
 *   onAgentStart: (p) => ...,
 *   onAgentChunk: (p) => ...,
 *   onTaskDone: (p) => ...,
 * })
 * onUnmounted(cleanup)
 * ```
 */
export function useSocket() {
  /**
   * 订阅指定任务的事件
   * @param taskId 任务 ID
   * @param handlers 事件处理函数集合
   * @returns cleanup 函数，组件卸载时调用
   */
  function subscribeToTask(taskId: string, handlers: TaskSocketHandlers): SocketCleanup {
    const socket = getSocket()

    // 向服务端注册订阅
    const doSubscribe = () => {
      socket.emit('subscribe', { taskId })
    }

    if (socket.connected) {
      doSubscribe()
    } else {
      socket.once('connect', doSubscribe)
    }

    // 事件处理器
    function handlePipelineEvent(event: PipelineSocketEvent) {
      if (event.taskId !== taskId) return

      switch (event.type) {
        case 'agent_start':
          handlers.onAgentStart?.({ taskId: event.taskId, agent: event.agent })
          break
        case 'agent_chunk':
          handlers.onAgentChunk?.({ taskId: event.taskId, agent: event.agent, chunk: event.chunk })
          break
        case 'agent_done':
          handlers.onAgentDone?.({ taskId: event.taskId, agent: event.agent })
          break
        case 'file_created':
          handlers.onFileCreated?.({
            taskId: event.taskId,
            path: event.path,
            language: event.language,
          })
          break
        case 'task_done':
          handlers.onTaskDone?.({ taskId: event.taskId, fileCount: event.fileCount })
          break
        case 'task_failed':
          handlers.onTaskFailed?.({ taskId: event.taskId, error: event.error })
          break
      }
    }

    socket.on('pipeline', handlePipelineEvent)

    // 返回 cleanup 函数
    return () => {
      socket.off('pipeline', handlePipelineEvent)
    }
  }

  return { subscribeToTask }
}
