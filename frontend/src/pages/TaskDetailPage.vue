<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppLayout from '../components/AppLayout.vue'
import FileTree from '../components/FileTree.vue'
import CodePreview from '../components/CodePreview.vue'
import PreviewPane from '../components/PreviewPane.vue'
import { useSocket } from '../composables/useSocket'
import type { SocketCleanup } from '../composables/useSocket'
import type { Task, GeneratedFile, AgentRole } from '../types'
import { getTask, getTaskFiles, pushToGithub } from '../api/tasks'

// ─── Route ──────────────────────────────────────────────────

const route = useRoute()
const router = useRouter()
const taskId = computed(() => route.params.id as string)

// ─── State ──────────────────────────────────────────────────

const task = ref<Task | null>(null)
const files = ref<GeneratedFile[]>([])
const isLoading = ref(true)
const loadError = ref<string | null>(null)

/** 当前选中的文件路径 */
const selectedPath = ref<string>('')

/** 当前选中的文件对象 */
const selectedFile = computed<GeneratedFile | null>(
  () => files.value.find((f) => f.path === selectedPath.value) ?? null
)

// ─── Agent 步骤状态 ──────────────────────────────────────────

type AgentStepStatus = 'pending' | 'running' | 'done'

type AgentStep = {
  role: AgentRole
  label: string
  description: string
  /** 该 Agent 的流式累积文本 */
  streamText: string
  status: AgentStepStatus
}

const AGENT_STEPS: AgentStep[] = [
  { role: 'pm', label: 'PM Agent', description: '分析需求，拆解功能列表...', streamText: '', status: 'pending' },
  { role: 'architect', label: 'Architect Agent', description: '设计架构，生成文件清单...', streamText: '', status: 'pending' },
  { role: 'engineer', label: 'Engineer Agent', description: '生成代码文件...', streamText: '', status: 'pending' },
  { role: 'qa', label: 'QA Agent', description: '检查质量，输出问题清单...', streamText: '', status: 'pending' },
]

const agentSteps = ref<AgentStep[]>(AGENT_STEPS.map((s) => ({ ...s })))

/** 当前正在执行的 Agent 角色 */
const currentAgentRole = ref<AgentRole | null>(null)

/** 当前正在执行的 step 对象 */
const currentStep = computed<AgentStep | null>(
  () => agentSteps.value.find((s) => s.role === currentAgentRole.value) ?? null
)

// ─── 右侧标签 ────────────────────────────────────────────────

/** 右侧区域激活标签 */
const activeRightTab = ref<'code' | 'preview'>('code')

/** 判断是否可预览（有 index.html 即可） */
function canPreview(fileList: GeneratedFile[]): boolean {
  return fileList.some((f) => f.path.replace(/^\//, '').endsWith('index.html'))
}

// ─── 视图模式 ────────────────────────────────────────────────

/** 是否处于"完成视图"（展示文件树 + 代码预览） */
const isDoneView = computed<boolean>(
  () => task.value?.status === 'done'
)

/** 是否处于"运行中视图" */
const isRunningView = computed<boolean>(
  () => task.value?.status === 'running' || task.value?.status === 'pending'
)

// ─── 状态徽章 ────────────────────────────────────────────────

const statusBadge = computed(() => {
  const s = task.value?.status ?? 'pending'
  const map = {
    pending: { label: 'Pending', cls: 'bg-gray-800 text-gray-400' },
    running: { label: 'Running', cls: 'bg-blue-900/40 text-blue-400' },
    done:    { label: 'Done',    cls: 'bg-emerald-900/40 text-emerald-400' },
    failed:  { label: 'Failed',  cls: 'bg-red-900/40 text-red-400' },
  }
  return map[s] ?? map.pending
})

// ─── Socket.io ──────────────────────────────────────────────

const { subscribeToTask } = useSocket()
let socketCleanup: SocketCleanup | null = null

function connectSocket() {
  socketCleanup = subscribeToTask(taskId.value, {
    onAgentStart({ agent }) {
      currentAgentRole.value = agent
      const step = agentSteps.value.find((s) => s.role === agent)
      if (step) {
        step.status = 'running'
        step.streamText = ''
      }
      // 刷新任务状态为 running
      if (task.value && task.value.status === 'pending') {
        task.value = { ...task.value, status: 'running' }
      }
    },
    onAgentChunk({ agent, chunk }) {
      const step = agentSteps.value.find((s) => s.role === agent)
      if (step) {
        step.streamText += chunk
      }
    },
    onAgentDone({ agent }) {
      const step = agentSteps.value.find((s) => s.role === agent)
      if (step) {
        step.status = 'done'
      }
      if (currentAgentRole.value === agent) {
        currentAgentRole.value = null
      }
    },
    async onTaskDone() {
      // 重新拉取最新任务状态和文件列表
      try {
        const [freshTask, freshFiles] = await Promise.all([
          getTask(taskId.value),
          getTaskFiles(taskId.value),
        ])
        task.value = freshTask
        files.value = freshFiles
        // 默认选中第一个文件
        if (freshFiles.length > 0) {
          selectedPath.value = freshFiles[0].path
        }
      } catch {
        // 忽略，后续 UI 会展示已有内容
      }
      // 断开 socket（任务已完成）
      socketCleanup?.()
      socketCleanup = null
    },
    onTaskFailed({ error }) {
      if (task.value) {
        task.value = { ...task.value, status: 'failed', errorMsg: error }
      }
      socketCleanup?.()
      socketCleanup = null
    },
  })
}

// ─── GitHub 推送 ─────────────────────────────────────────────

/** 推送中 loading 状态 */
const isPushing = ref(false)
/** 推送结果 */
const pushResult = ref<{ repoUrl: string; commitUrl: string } | null>(null)
/** 推送错误信息 */
const pushError = ref<string | null>(null)

/** 推送任务代码到 GitHub */
async function handlePush() {
  if (isPushing.value) return
  isPushing.value = true
  pushError.value = null
  try {
    const result = await pushToGithub(taskId.value)
    pushResult.value = result
  } catch (err) {
    pushError.value = err instanceof Error ? err.message : '推送失败，请检查 GitHub 配置'
  } finally {
    isPushing.value = false
  }
}

// ─── 下载 ZIP ────────────────────────────────────────────────

/** 触发 blob 下载 */
async function handleDownload() {
  const url = `http://localhost:3000/api/tasks/${taskId.value}/download`
  try {
    const resp = await fetch(url)
    if (!resp.ok) throw new Error('下载失败')
    const blob = await resp.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `task-${taskId.value}.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch (err) {
    console.error('Download failed:', err)
  }
}

// ─── 生命周期 ────────────────────────────────────────────────

onMounted(async () => {
  isLoading.value = true
  loadError.value = null
  try {
    const [fetchedTask, fetchedFiles] = await Promise.all([
      getTask(taskId.value),
      getTaskFiles(taskId.value),
    ])
    task.value = fetchedTask
    files.value = fetchedFiles

    if (fetchedFiles.length > 0 && fetchedTask.status === 'done') {
      selectedPath.value = fetchedFiles[0].path
    }

    // 如果任务还在运行中，连接 socket
    if (fetchedTask.status === 'running' || fetchedTask.status === 'pending') {
      connectSocket()
    }
  } catch (err) {
    loadError.value = err instanceof Error ? err.message : '加载任务失败'
  } finally {
    isLoading.value = false
  }
})

onUnmounted(() => {
  socketCleanup?.()
  socketCleanup = null
})
</script>

<template>
  <AppLayout>
    <!-- ── Header（topbar 插槽） ── -->
    <template #topbar>
      <div class="flex items-center gap-3 flex-1 min-w-0">
        <!-- 返回按钮 -->
        <button
          class="flex-shrink-0 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm font-medium rounded-lg border border-gray-700 transition-colors"
          @click="router.back()"
        >
          ← 返回
        </button>

        <!-- 任务标题 -->
        <span class="text-sm font-medium text-gray-100 truncate min-w-0">
          {{ task ? task.requirement.slice(0, 50) : '加载中...' }}
        </span>

        <!-- 状态徽章 -->
        <span
          v-if="task"
          class="flex-shrink-0 px-2 py-0.5 text-xs font-medium rounded"
          :class="statusBadge.cls"
        >
          {{ statusBadge.label }}
        </span>
      </div>

      <!-- GitHub 推送按钮（完成后显示） -->
      <template v-if="isDoneView">
        <!-- 推送成功后显示仓库链接 -->
        <a
          v-if="pushResult"
          :href="pushResult.repoUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          查看仓库
        </a>
        <!-- 推送按钮 -->
        <button
          v-else
          :disabled="isPushing"
          class="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
          @click="handlePush"
        >
          <svg v-if="isPushing" class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
          <svg v-else class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z"/>
          </svg>
          {{ isPushing ? '推送中...' : '推送到 GitHub' }}
        </button>
        <!-- 推送错误提示 -->
        <span v-if="pushError" class="text-xs text-red-400 flex-shrink-0 max-w-xs truncate" :title="pushError">
          ⚠ {{ pushError }}
        </span>
      </template>

      <!-- 下载按钮（完成后显示） -->
      <button
        v-if="isDoneView"
        class="flex-shrink-0 flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
        @click="handleDownload"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        下载 ZIP
      </button>
    </template>

    <!-- ── Loading ── -->
    <div v-if="isLoading" class="flex items-center justify-center py-20">
      <div class="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- ── Load Error ── -->
    <div
      v-else-if="loadError"
      class="flex flex-col items-center justify-center py-20 gap-3"
    >
      <svg class="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p class="text-gray-400 text-sm">{{ loadError }}</p>
    </div>

    <!-- ── 主体布局 ── -->
    <div v-else-if="task" class="flex h-full overflow-hidden">
      <!-- ── 左栏 40% ── -->
      <div class="w-2/5 flex-shrink-0 border-r border-gray-800 flex flex-col overflow-hidden">

        <!-- 运行中视图：Agent 步骤卡片 + 流式输出 -->
        <template v-if="isRunningView">
          <div class="flex-1 overflow-y-auto p-4 space-y-3">
            <!-- Agent 步骤进度卡片 -->
            <div
              v-for="step in agentSteps"
              :key="step.role"
              class="flex items-start gap-3 p-4 rounded-lg border transition-colors"
              :class="{
                'bg-blue-950/30 border-blue-800/50': step.status === 'running',
                'bg-emerald-950/20 border-emerald-800/30': step.status === 'done',
                'bg-gray-900 border-gray-800': step.status === 'pending',
              }"
            >
              <!-- 状态指示器 -->
              <div class="flex-shrink-0 mt-1">
                <!-- 完成：✓ 图标 -->
                <svg
                  v-if="step.status === 'done'"
                  class="w-4 h-4 text-emerald-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-width="2.5"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <!-- 进行中：脉冲圆点 -->
                <div
                  v-else-if="step.status === 'running'"
                  class="w-2 h-2 rounded-full bg-blue-400 animate-pulse mt-1"
                />
                <!-- 等待中：灰色圆点 -->
                <div
                  v-else
                  class="w-2 h-2 rounded-full bg-gray-600 mt-1"
                />
              </div>

              <!-- 标题 + 描述 -->
              <div class="flex-1 min-w-0">
                <div
                  class="text-sm font-medium"
                  :class="{
                    'text-blue-400': step.status === 'running',
                    'text-emerald-400': step.status === 'done',
                    'text-gray-500': step.status === 'pending',
                  }"
                >
                  {{ step.label }}
                </div>
                <div class="text-xs text-gray-400 mt-0.5">{{ step.description }}</div>
              </div>
            </div>

            <!-- 当前 Agent 流式输出区 -->
            <div
              v-if="currentStep && currentStep.streamText"
              class="mt-2 p-4 rounded-lg bg-gray-900 border border-gray-800"
            >
              <div class="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">
                {{ currentStep.label }} 输出
              </div>
              <div class="font-mono text-sm text-gray-300 leading-relaxed whitespace-pre-wrap max-h-64 overflow-y-auto">
                {{ currentStep.streamText }}<span class="animate-pulse text-blue-400">▋</span>
              </div>
            </div>

            <!-- 失败状态 -->
            <div
              v-if="task.status === 'failed'"
              class="p-4 rounded-lg bg-red-900/20 border border-red-800/50"
            >
              <div class="flex items-start gap-3">
                <svg class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p class="text-red-400 font-medium text-sm">任务执行失败</p>
                  <p class="text-gray-400 text-xs mt-1">{{ task.errorMsg ?? '未知错误' }}</p>
                </div>
              </div>
            </div>
          </div>
        </template>

        <!-- 完成视图：文件树 -->
        <template v-else-if="isDoneView">
          <div class="px-4 py-3 border-b border-gray-800 flex-shrink-0">
            <h3 class="text-sm font-medium text-gray-200">生成文件</h3>
            <p class="text-xs text-gray-500 mt-0.5">{{ files.length }} 个文件</p>
          </div>
          <div class="flex-1 overflow-y-auto py-1">
            <FileTree
              :files="files"
              :selected-path="selectedPath"
              @select="selectedPath = $event"
            />
          </div>
        </template>
      </div>

      <!-- ── 右栏 60% ── -->
      <div class="flex-1 flex flex-col overflow-hidden bg-gray-950">
        <!-- 运行中：等待提示 -->
        <div
          v-if="isRunningView"
          class="flex flex-col items-center justify-center h-full gap-3 text-gray-500"
        >
          <svg class="w-12 h-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
          <p class="text-sm">代码生成完成后可在此预览</p>
        </div>

        <!-- 完成：标签栏 + 内容区 -->
        <template v-else-if="isDoneView">
          <!-- 标签栏 -->
          <div class="flex-shrink-0 flex items-center bg-gray-900 border-b border-gray-800">
            <!-- 代码标签 -->
            <button
              class="px-4 py-2.5 text-sm font-medium transition-colors border-b-2"
              :class="activeRightTab === 'code'
                ? 'text-violet-400 border-violet-400'
                : 'text-gray-500 hover:text-gray-300 border-transparent'"
              @click="activeRightTab = 'code'"
            >
              代码
            </button>
            <!-- 预览标签 -->
            <button
              class="px-4 py-2.5 text-sm font-medium transition-colors border-b-2"
              :class="[
                activeRightTab === 'preview'
                  ? 'text-violet-400 border-violet-400'
                  : 'text-gray-500 hover:text-gray-300 border-transparent',
                !canPreview(files) ? 'pointer-events-none opacity-40' : '',
              ]"
              :title="!canPreview(files) ? '该项目不包含 index.html，无法在浏览器预览' : undefined"
              @click="activeRightTab = 'preview'"
            >
              预览
            </button>
          </div>

          <!-- 代码面板 -->
          <CodePreview
            v-if="activeRightTab === 'code'"
            :content="selectedFile?.content ?? ''"
            :language="selectedFile?.language ?? ''"
            :path="selectedPath"
          />

          <!-- 预览面板 -->
          <div v-else-if="activeRightTab === 'preview'" class="flex-1 overflow-hidden">
            <PreviewPane :files="files" />
          </div>
        </template>
      </div>
    </div>
  </AppLayout>
</template>
