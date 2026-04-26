<template>
  <div class="max-w-2xl mx-auto px-6 py-8">
    <h1 class="text-2xl font-semibold text-primary mb-8">设置</h1>

    <!-- 模型配置 -->
    <div class="bg-surface border border-border-default rounded-lg p-6 mb-6">
      <h2 class="text-lg font-medium text-primary mb-4">AI 模型配置</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-sm text-secondary mb-2">模型提供商</label>
          <select
            v-model="form.modelProvider"
            class="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-primary text-sm focus:outline-none focus:border-accent"
          >
            <option value="catpaw">CatPaw (内部)</option>
            <option value="claude">Claude (Anthropic)</option>
            <option value="openai">OpenAI</option>
          </select>
        </div>

        <div>
          <label class="block text-sm text-secondary mb-2">模型名称</label>
          <input
            v-model="form.modelName"
            type="text"
            placeholder="e.g. catclaw-proxy-model"
            class="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-primary text-sm focus:outline-none focus:border-accent"
          />
        </div>

        <div>
          <label class="block text-sm text-secondary mb-2">API Key</label>
          <input
            v-model="form.apiKey"
            type="password"
            placeholder="输入 API Key（留空表示不更改）"
            class="w-full bg-elevated border border-border-default rounded-md px-3 py-2 text-primary text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>
    </div>

    <!-- GitHub 配置 -->
    <div class="bg-surface border border-border-default rounded-lg p-6 mb-6">
      <h2 class="text-lg font-medium text-primary mb-4">GitHub 配置</h2>

      <div class="space-y-4">
        <div>
          <label class="block text-sm text-secondary mb-2">Personal Access Token</label>
          <div class="flex gap-2">
            <input
              v-model="form.githubToken"
              type="password"
              placeholder="ghp_xxxxxxxxxxxx"
              class="flex-1 bg-elevated border border-border-default rounded-md px-3 py-2 text-primary text-sm focus:outline-none focus:border-accent"
            />
            <button
              @click="testGithub"
              :disabled="testing"
              class="px-4 py-2 bg-elevated border border-border-default rounded-md text-sm text-secondary hover:text-primary hover:border-border-strong transition-colors duration-150 disabled:opacity-50"
            >
              {{ testing ? '验证中...' : '测试' }}
            </button>
          </div>
          <p v-if="githubTestResult" :class="githubTestResult.valid ? 'text-success' : 'text-error'" class="text-xs mt-2">
            {{ githubTestResult.valid ? `✓ 验证成功，用户：${githubTestResult.username}` : '✗ Token 无效' }}
          </p>
        </div>
      </div>
    </div>

    <!-- 保存按钮 -->
    <div class="flex justify-end">
      <button
        @click="save"
        :disabled="saving"
        class="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-md text-sm font-medium transition-colors duration-150 disabled:opacity-50"
      >
        {{ saving ? '保存中...' : '保存设置' }}
      </button>
    </div>

    <p v-if="saveMessage" class="text-right mt-2 text-xs text-success">{{ saveMessage }}</p>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getSettings, updateSettings, testGithub as testGithubApi } from '../api/settings'

const form = ref({
  modelProvider: 'catpaw',
  modelName: 'catclaw-proxy-model',
  apiKey: '',
  githubToken: '',
})

const saving = ref(false)
const saveMessage = ref('')
const testing = ref(false)
const githubTestResult = ref<{ valid: boolean; username: string | null } | null>(null)

onMounted(async () => {
  const settings = await getSettings()
  form.value.modelProvider = settings.modelProvider
  form.value.modelName = settings.modelName
})

async function save() {
  saving.value = true
  saveMessage.value = ''
  try {
    const payload: Record<string, string> = {
      modelProvider: form.value.modelProvider,
      modelName: form.value.modelName,
    }
    if (form.value.apiKey) payload['apiKey'] = form.value.apiKey
    if (form.value.githubToken) payload['githubToken'] = form.value.githubToken
    await updateSettings(payload)
    saveMessage.value = '已保存'
    form.value.apiKey = ''
    form.value.githubToken = ''
  } finally {
    saving.value = false
  }
}

async function testGithub() {
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
