import apiClient from './index'
import type { Settings } from '../types'

/** 更新设置请求体 */
type UpdateSettingsPayload = {
  modelProvider?: 'catpaw' | 'claude' | 'openai'
  modelName?: string
  apiKey?: string
  githubToken?: string
}

/** API 成功响应包装 */
type ApiResponse<T> = {
  success: true
  data: T
}

/**
 * 获取当前设置
 * @returns 设置对象（不含明文 Token）
 */
export async function getSettings(): Promise<Settings> {
  const res = await apiClient.get<ApiResponse<Settings>>('/api/settings')
  return res.data.data
}

/**
 * 更新设置
 * @param payload 要更新的字段
 * @returns 更新后的设置
 */
export async function updateSettings(payload: UpdateSettingsPayload): Promise<Settings> {
  const res = await apiClient.patch<ApiResponse<Settings>>('/api/settings', payload)
  return res.data.data
}

/**
 * 测试 GitHub Token 是否有效
 * @returns 是否有效 + GitHub 用户名
 */
export async function testGithub(): Promise<{ valid: boolean; username?: string }> {
  const res = await apiClient.post<ApiResponse<{ valid: boolean; username?: string }>>(
    '/api/settings/test-github'
  )
  return res.data.data
}
