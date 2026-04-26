<template>
  <div class="max-w-2xl mx-auto px-6 py-8">
    <h1 class="text-2xl font-semibold text-gray-100 mb-8">设置</h1>

    <!-- AI 模型配置 -->
    <div class="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
      <h2 class="text-sm font-medium text-gray-400 uppercase tracking-wide mb-5">AI 模型配置</h2>

      <!-- Provider 选择器（卡片式） -->
      <div class="mb-5">
        <label class="block text-sm text-gray-400 mb-3">模型提供商</label>
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="opt in providerOptions"
            :key="opt.value"
            class="flex flex-col items-start gap-1.5 p-4 rounded-xl border text-left transition-all duration-150"
            :class="
              form.modelProvider === opt.value
                ? 'border-violet-500 bg-violet-600/10 text-gray-100'
                : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-600 hover:bg-gray-800'
            "
            @click="form.modelProvider = opt.value"
          >
            <span
              class="text-sm font-medium"
              :class="form.modelProvider === opt.value ? 'text-violet-400' : 'text-gray-300'"
            >{{ opt.label }}</span>
            <span class="text-xs text-gray-500 leading-relaxed">{{ opt.desc }}</span>
          </button>
        </div>
      </div>

      <!-- Mock 说明 -->
      <div v-if="form.modelProvider === 'mock'" class="rounded-lg bg-gray-800 border border-gray-700 px-4 py-3 text-sm text-gray-400">
        使用本地模拟数据，无需 API Key。适合功能演示和离线开发。
      </div>

      <!-- OpenAI / Compatible 字段 -->
      <div v-else-if="form.modelProvider === 'openai'" class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1.5">API Key</label>
          <input
            v-model="form.modelApiKey"
            type="password"
            :placeholder="hasModelApiKey ? '已设置（留空不修改）' : '输入 API Key'"
            class="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1.5">Base URL <span class="text-gray-600">（可选）</span></label>
          <input
            v-model="form.modelBaseUrl"
            type="text"
            placeholder="https://api.openai.com/v1，留空使用默认"
            class="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1.5">模型名称</label>
          <input
            v-model="form.modelName"
            type="text"
            placeholder="gpt-4o"
            class="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      <!-- Claude 字段 -->
      <div v-else-if="form.modelProvider === 'claude'" class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1.5">API Key</label>
          <input
            v-model="form.modelApiKey"
            type="password"
            :placeholder="hasModelApiKey ? '已设置（留空不修改）' : '输入 Anthropic API Key'"
            class="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1.5">模型名称</label>
          <input
            v-model="form.modelName"
            type="text"
            placeholder="claude-3-5-sonnet-20241022"
            class="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>
    </div>

    <!-- GitHub 配置 -->
    <div class="bg-gray-900 border border-gray-800 rounded-lg p-6 mb-6">
      <h2 class="text-sm font-medium text-gray-400 uppercase tracking-wide mb-5">GitHub 配置</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1.5">Personal Access Token</label>
          <div class="flex gap-2">
            <input
              v-model="form.githubToken"
              type="password"
              placeholder="ghp_xxxxxxxxxxxx"
              class="flex-1 bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
            />
            <button
              @click="testGithub"
              :disabled="testing || !form.githubToken"
              class="px-4 py-2 bg-gray-800 border border-gray-700 rounded-md text-sm text-gray-400 hover:text-gray-100 hover:border-gray-500 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {{ testing ? '验证中...' : '测试' }}
            </button>
          </div>
          <p
            v-if="githubTestResult"
            class="text-xs mt-2"
            :class="githubTestResult.valid ? 'text-emerald-400' : 'text-red-400'"
          >
            {{ githubTestResult.valid ? `✓ 验证成功，用户：${githubTestResult.username}` : '✗ Token 无效' }}
          </p>
        </div>

        <div>
          <label class="block text-sm text-gray-400 mb-1.5">GitHub 用户名</label>
          <input
            v-model="form.githubUsername"
            type="text"
            placeholder="your-github-username"
            class="w-full bg-gray-900 border border-gray-700 rounded-md px-3 py-2 text-gray-100 text-sm placeholder-gray-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
          <p class="text-xs text-gray-600 mt-1">推送到 GitHub 时使用此用户名创建仓库</p>
        </div>
      </div>
    </div>

    <!-- 保存按钮 -->
    <div class="flex items-center justify-end gap-4">
      <p v-if="saveMessage" class="text-xs text-emerald-400">{{ saveMessage }}</p>
      <button
        @click="save"
        :disabled="saving"
        class="px-6 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-md text-sm font-medium transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {{ saving ? '保存中...' : '保存设置' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSettings, updateSettings, testGithub as testGithubApi } from '../api/settings'

/** Provider selector options */
const providerOptions = [
  { value: 'mock', label: 'Mock', desc: '本地模拟，无需 API Key' },
  { value: 'openai', label: 'OpenAI / Compatible', desc: 'OpenAI 或兼容接口（含 CatPaw）' },
  { value: 'claude', label: 'Claude', desc: 'Anthropic Claude 系列' },
]

const form = ref({
  modelProvider: 'mock',
  modelName: '',
  modelApiKey: '',
  modelBaseUrl: '',
  githubToken: '',
  githubUsername: '',
})

/** Whether a model API key is already stored (from backend) */
const hasModelApiKey = ref(false)

const saving = ref(false)
const saveMessage = ref('')
const testing = ref(false)
const githubTestResult = ref<{ valid: boolean; username: string | null } | null>(null)

onMounted(async () => {
  const settings = await getSettings()
  form.value.modelProvider = settings.modelProvider || 'mock'
  form.value.modelName = settings.modelName || ''
  form.value.modelBaseUrl = settings.modelBaseUrl || ''
  form.value.githubUsername = settings.githubUsername ?? ''
  hasModelApiKey.value = settings.hasModelApiKey
})

/** Save settings to backend */
async function save(): Promise<void> {
  saving.value = true
  saveMessage.value = ''
  try {
    const payload: Record<string, string> = {
      modelProvider: form.value.modelProvider,
      modelName: form.value.modelName,
      modelBaseUrl: form.value.modelBaseUrl,
      githubUsername: form.value.githubUsername,
    }
    // Only send API key fields if user typed something
    if (form.value.modelApiKey) payload['modelApiKey'] = form.value.modelApiKey
    if (form.value.githubToken) payload['githubToken'] = form.value.githubToken

    await updateSettings(payload)
    saveMessage.value = '已保存'
    // Clear sensitive fields after save
    form.value.modelApiKey = ''
    form.value.githubToken = ''
    // Refresh hasModelApiKey status
    if (payload['modelApiKey']) hasModelApiKey.value = true
    setTimeout(() => { saveMessage.value = '' }, 3000)
  } finally {
    saving.value = false
  }
}

/** Test GitHub token validity */
async function testGithub(): Promise<void> {
  if (!form.value.githubToken) return
  testing.value = true
  githubTestResult.value = null
  try {
    const result = await testGithubApi()
    githubTestResult.value = { valid: result.valid, username: result.username ?? null }
  } finally {
    testing.value = false
  }
}
</script>
