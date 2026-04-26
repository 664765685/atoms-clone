import { reactive, ref, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'
import type { PipelineEvent, AgentRole } from '../types'

/** Socket 事件（带 taskId） */
type SocketEvent = PipelineEvent & { taskId: string }

/** useTaskSocket 返回值类型 */
type UseTaskSocketReturn = {
  /** 已接收的所有事件 */
  events: SocketEvent[]
  /** 当前正在执行的 Agent */
  currentAgent: AgentRole | null
  /** 当前 Agent 的流式内容缓冲区 */
  currentChunk: string
  /** 任务是否已完成（done 或 failed） */
  isDone: boolean
  /** 错误信息（任务失败时） */
  errorMessage: string | null
  /** 订阅指定任务的事件 */
  subscribe: (taskId: string) => void
  /** 取消订阅 */
  unsubscribe: () => void
}

/**
 * Socket.io composable，用于接收 Agent 执行进度的实时推送
 * @returns reactive 的事件列表和当前状态
 */
export function useTaskSocket(): UseTaskSocketReturn {
  const events = reactive<SocketEvent[]>([])
  const currentAgent = ref<AgentRole | null>(null)
  const currentChunk = ref<string>('')
  const isDone = ref<boolean>(false)
  const errorMessage = ref<string | null>(null)

  let socket: Socket | null = null
  let subscribedTaskId: string | null = null

  /**
   * 订阅指定任务的 Socket 事件
   * @param taskId 任务 ID
   */
  function subscribe(taskId: string): void {
    // 如果已订阅同一任务则跳过
    if (subscribedTaskId === taskId && socket?.connected) {
      return
    }

    // 重置状态
    events.splice(0, events.length)
    currentAgent.value = null
    currentChunk.value = ''
    isDone.value = false
    errorMessage.value = null

    // 建立连接
    if (!socket) {
      socket = io('http://localhost:3000', {
        transports: ['websocket', 'polling'],
      })
    }

    socket.on('connect', () => {
      socket!.emit('subscribe', { taskId })
    })

    // 如果已连接，直接订阅
    if (socket.connected) {
      socket.emit('subscribe', { taskId })
    }

    // 监听 Pipeline 事件
    socket.on('pipeline_event', (event: SocketEvent) => {
      if (event.taskId !== taskId) return

      events.push(event)

      switch (event.type) {
        case 'agent_start':
          currentAgent.value = event.agent
          currentChunk.value = ''
          break

        case 'agent_chunk':
          currentChunk.value += event.chunk
          break

        case 'agent_done':
          currentChunk.value = ''
          break

        case 'task_done':
          isDone.value = true
          currentAgent.value = null
          break

        case 'task_failed':
          isDone.value = true
          errorMessage.value = event.error
          currentAgent.value = null
          break
      }
    })

    subscribedTaskId = taskId
  }

  /**
   * 取消订阅并断开连接
   */
  function unsubscribe(): void {
    if (socket) {
      socket.disconnect()
      socket = null
    }
    subscribedTaskId = null
  }

  onUnmounted(() => {
    unsubscribe()
  })

  return {
    events,
    currentAgent: currentAgent as unknown as AgentRole | null,
    currentChunk: currentChunk as unknown as string,
    isDone: isDone as unknown as boolean,
    errorMessage: errorMessage as unknown as string | null,
    subscribe,
    unsubscribe,
  }
}
