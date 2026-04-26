import apiClient from './index'
import type { Task, GeneratedFile } from '../types'

/** 创建任务请求体 */
type CreateTaskPayload = {
  requirement: string
  techStack: { frontend: string; backend: string }
}

/** API 成功响应包装 */
type ApiResponse<T> = {
  success: true
  data: T
}

/**
 * 创建新任务
 * @param payload 需求描述 + 技术栈
 * @returns 新建的任务对象
 */
export async function createTask(payload: CreateTaskPayload): Promise<Task> {
  const res = await apiClient.post<ApiResponse<Task>>('/api/tasks', payload)
  return res.data.data
}

/**
 * 获取任务列表（按创建时间倒序）
 * @returns 任务列表
 */
export async function getTasks(): Promise<Task[]> {
  const res = await apiClient.get<ApiResponse<Task[]>>('/api/tasks')
  return res.data.data
}

/**
 * 获取单个任务详情
 * @param id 任务 ID
 * @returns 任务详情
 */
export async function getTask(id: string): Promise<Task> {
  const res = await apiClient.get<ApiResponse<Task>>(`/api/tasks/${id}`)
  return res.data.data
}

/**
 * 获取任务生成的文件列表
 * @param id 任务 ID
 * @returns 文件列表
 */
export async function getTaskFiles(id: string): Promise<GeneratedFile[]> {
  const res = await apiClient.get<ApiResponse<GeneratedFile[]>>(`/api/tasks/${id}/files`)
  return res.data.data
}

/**
 * 将任务代码推送到 GitHub
 * @param id 任务 ID
 * @returns 推送结果（仓库 URL + commit URL）
 */
export async function pushToGithub(
  id: string
): Promise<{ repoUrl: string; commitUrl: string }> {
  const res = await apiClient.post<ApiResponse<{ repoUrl: string; commitUrl: string }>>(
    `/api/tasks/${id}/push`
  )
  return res.data.data
}
