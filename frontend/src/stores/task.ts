import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Task, GeneratedFile } from '../types'
import { getTasks, getTask, getTaskFiles } from '../api/tasks'

/**
 * 任务状态管理 Store
 */
export const useTaskStore = defineStore('task', () => {
  /** 任务列表 */
  const tasks = ref<Task[]>([])
  /** 当前查看的任务详情 */
  const currentTask = ref<Task | null>(null)
  /** 当前任务的文件列表 */
  const currentFiles = ref<GeneratedFile[]>([])
  /** 列表加载状态 */
  const isLoadingList = ref<boolean>(false)
  /** 详情加载状态 */
  const isLoadingDetail = ref<boolean>(false)
  /** 错误信息 */
  const error = ref<string | null>(null)

  /**
   * 加载任务列表
   */
  async function fetchTasks(): Promise<void> {
    isLoadingList.value = true
    error.value = null
    try {
      tasks.value = await getTasks()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载任务列表失败'
    } finally {
      isLoadingList.value = false
    }
  }

  /**
   * 加载任务详情
   * @param id 任务 ID
   */
  async function fetchTask(id: string): Promise<void> {
    isLoadingDetail.value = true
    error.value = null
    try {
      currentTask.value = await getTask(id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载任务详情失败'
    } finally {
      isLoadingDetail.value = false
    }
  }

  /**
   * 加载任务文件列表
   * @param id 任务 ID
   */
  async function fetchTaskFiles(id: string): Promise<void> {
    try {
      currentFiles.value = await getTaskFiles(id)
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载文件列表失败'
    }
  }

  /**
   * 将任务更新到本地列表（用于创建后立即展示）
   * @param task 任务对象
   */
  function upsertTask(task: Task): void {
    const index = tasks.value.findIndex((t) => t.id === task.id)
    if (index !== -1) {
      tasks.value[index] = task
    } else {
      tasks.value.unshift(task)
    }
  }

  /**
   * 更新当前任务状态
   * @param update 要更新的字段
   */
  function updateCurrentTask(update: Partial<Task>): void {
    if (currentTask.value) {
      currentTask.value = { ...currentTask.value, ...update }
    }
  }

  /**
   * 清除当前任务
   */
  function clearCurrentTask(): void {
    currentTask.value = null
    currentFiles.value = []
  }

  return {
    tasks,
    currentTask,
    currentFiles,
    isLoadingList,
    isLoadingDetail,
    error,
    fetchTasks,
    fetchTask,
    fetchTaskFiles,
    upsertTask,
    updateCurrentTask,
    clearCurrentTask,
  }
})
