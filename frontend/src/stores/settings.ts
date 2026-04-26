import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Settings } from '../types'
import { getSettings, updateSettings } from '../api/settings'

/**
 * 设置状态管理 Store
 */
export const useSettingsStore = defineStore('settings', () => {
  /** 设置数据 */
  const settings = ref<Settings | null>(null)
  /** 加载状态 */
  const isLoading = ref<boolean>(false)
  /** 保存状态 */
  const isSaving = ref<boolean>(false)
  /** 错误信息 */
  const error = ref<string | null>(null)
  /** 保存成功提示 */
  const saveSuccess = ref<boolean>(false)

  /**
   * 加载设置
   */
  async function fetchSettings(): Promise<void> {
    isLoading.value = true
    error.value = null
    try {
      settings.value = await getSettings()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '加载设置失败'
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 保存设置
   * @param payload 要保存的字段（可以包含明文 Token）
   */
  async function saveSettings(payload: {
    modelProvider?: 'catpaw' | 'claude' | 'openai'
    modelName?: string
    apiKey?: string
    githubToken?: string
  }): Promise<boolean> {
    isSaving.value = true
    error.value = null
    saveSuccess.value = false
    try {
      settings.value = await updateSettings(payload)
      saveSuccess.value = true
      return true
    } catch (err) {
      error.value = err instanceof Error ? err.message : '保存设置失败'
      return false
    } finally {
      isSaving.value = false
    }
  }

  return {
    settings,
    isLoading,
    isSaving,
    error,
    saveSuccess,
    fetchSettings,
    saveSettings,
  }
})
