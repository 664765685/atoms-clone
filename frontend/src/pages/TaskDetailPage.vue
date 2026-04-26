<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import {
  Github,
  Download,
  RefreshCw,
  AlertCircle,
  FileCode2,
  ChevronRight,
} from 'lucide-vue-next'
import AppLayout from '../components/AppLayout.vue'
import AgentProgress from '../components/AgentProgress.vue'
import { useTaskStore } from '../stores/task'
import { useTaskSocket } from '../composables/useTaskSocket'
import { pushToGithub } from '../api/tasks'
import type { AgentRole } from '../types'

const route = useRoute()
const taskStore = useTaskStore()

const taskId = computed(() => route.params.id as string)

/** Socket 实时状态 */
const { events, currentAgent, currentChunk, isDone, errorMessage, subscribe, unsubscribe } =
  useTaskSocket()

/** 已完成的 Agent 列表 */
const completedAgents = ref<AgentRole[]>([])

/** 流式输出日志（累积） */
const outputLog = ref<string>('')

/** 推送 GitHub 加载状态 */
const isPushing = ref<boolean>(false)
/** 推送错误 */
const pushError = ref<string | null>(null)

/** 状态 Badge 配置 */
const statusConfig = {
  pending: { label: 'Pending', class: 'bg-overlay text-secondary' },
  running: { label: 'Running', class: 'bg-accent-light text-accent' },
  done: { label: 'Done', class: 'bg-success/20 text-success' },
  failed: { label: 'Failed', class: 'bg-error/20 text-error' },
}

const currentStatus = computed(() => {
  const status = taskStore.currentTask?.status ?? 'pending'
  return statusConfig[status]
})

const isRunning = computed(() =>
  taskStore.currentTask?.status === 'running' || taskStore.currentTask?.status === 'pending'
)

const isFinished = computed(() => taskStore.currentTask?.status === 'done')

/** 监听 Socket 事件，更新完成列表和日志 */
watch(
  () => events.length,
  () => {
    const lastEvent = events[events.length - 1]
    if (!lastEvent) return

    if (lastEvent.type === 'agent_done') {
      if (!completedAgents.value.includes(lastEvent.agent)) {
        completedAgents.value.push(lastEvent.agent)
      }
    }

    if (lastEvent.type === 'agent_chunk') {
      outputLog.value += lastEvent.chunk
    }

    if (lastEvent.type === 'agent_start') {
      const labels: Record<AgentRole, string> = {
        pm: '\n\n## 📋 PM Agent — 需求分析\n\n',
        architect: '\n\n## 🏗️ Architect Agent — 架构设计\n\n',
        engineer: '\n\n## 💻 Engineer Agent — 代码生成\n\n',
        qa: '\n\n## 🧪 QA Agent — 质量检测\n\n',
      }
      outputLog.value += labels[lastEvent.agent] ?? ''
    }

    // 任务完成时刷新任务详情和文件列表
    if (lastEvent.type === 'task_done' || lastEvent.type === 'task_failed') {
      taskStore.fetchTask(taskId.value)
      if (lastEvent.type === 'task_done') {
        taskStore.fetchTaskFiles(taskId.value)
      }
    }
  }
)

/**
 * 推送到 GitHub
 */
async function handlePushToGithub(): Promise<void> {
  isPushing.value = true
  pushError.value = null
  try {
    const result = await pushToGithub(taskId.value)
    taskStore.updateCurrentTask({ githubRepo: result.repoUrl, githubCommit: result.commitUrl })
  } catch (err) {
    pushError.value = err instanceof Error ? err.message : '推送失败'
  } finally {
    isPushing.value = false
  }
}

onMounted(async () => {
  await taskStore.fetchTask(taskId.value)

  // 如果任务正在运行或 pending，订阅 Socket
  if (
    taskStore.currentTask?.status === 'running' ||
    taskStore.currentTask?.status === 'pending'
  ) {
    subscribe(taskId.value)
  }

  // 如果任务已完成，加载文件
  if (taskStore.currentTask?.status === 'done') {
    taskStore.fetchTaskFiles(taskId.value)
  }
})

onUnmounted(() => {
  unsubscribe()
  taskStore.clearCurrentTask()
})
</script>

<template>
  <AppLayout>
    <!-- Topbar 插槽 -->
    <template #topbar>
      <div class="flex items-center gap-3">
        <span class="text-primary text-sm font-medium">
          {{ taskStore.currentTask?.title ?? '加载中...' }}
        </span>
        <span
          v-if="taskStore.currentTask"
          class="px-2 py-0.5 rounded-md text-xs font-medium"
          :class="currentStatus.class"
        >
          {{ currentStatus.label }}
        </span>
      </div>
    </template>

    <!-- 加载状态 -->
    <div v-if="taskStore.isLoadingDetail" class="flex items-center justify-center py-20">
      <div class="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
    </div>

    <!-- 任务不存在 -->
    <div v-else-if="!taskStore.currentTask" class="flex flex-col items-center justify-center py-20 gap-3">
      <AlertCircle :size="40" class="text-muted" />
      <p class="text-secondary text-sm">任务不存在或已删除</p>
    </div>

    <template v-else>
      <!-- Agent 进度条（执行中显示） -->
      <AgentProgress
        v-if="isRunning || completedAgents.length > 0"
        :current-agent="(currentAgent as AgentRole | null)"
        :completed-agents="completedAgents"
      />

      <div class="flex h-full">
        <!-- 左侧：流式输出日志 -->
        <div class="flex-1 overflow-auto p-6">
          <!-- 执行中：流式输出区域 -->
          <div v-if="isRunning || outputLog">
            <h2 class="text-lg font-medium text-primary mb-4">执行日志</h2>
            <div class="bg-surface border border-border-default rounded-xl p-5 font-mono text-sm text-secondary whitespace-pre-wrap leading-relaxed min-h-64">
              <span v-if="outputLog">{{ outputLog }}</span>
              <!-- 当前流式内容 -->
              <span v-if="currentChunk" class="text-primary">{{ currentChunk }}</span>
              <!-- 光标动画 -->
              <span
                v-if="isRunning && !isDone"
                class="inline-block w-2 h-4 bg-accent ml-0.5 animate-pulse"
              />
            </div>
          </div>

          <!-- 失败状态 -->
          <div
            v-if="taskStore.currentTask.status === 'failed'"
            class="mt-4 p-4 rounded-xl bg-error/10 border border-error/20"
          >
            <div class="flex items-start gap-3">
              <AlertCircle :size="20" class="text-error flex-shrink-0 mt-0.5" />
              <div>
                <p class="text-error font-medium text-sm mb-1">任务执行失败</p>
                <p class="text-secondary text-xs">
                  {{ taskStore.currentTask.errorMsg ?? errorMessage ?? '未知错误' }}
                </p>
              </div>
            </div>
          </div>

          <!-- 完成状态：操作按钮 -->
          <div v-if="isFinished" class="mt-6 flex items-center gap-3">
            <button
              class="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors duration-150 disabled:opacity-50"
              :disabled="isPushing"
              @click="handlePushToGithub"
            >
              <div v-if="isPushing" class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <Github v-else :size="16" />
              {{ isPushing ? '推送中...' : '推送到 GitHub' }}
            </button>
            <a
              :href="`http://localhost:3000/api/tasks/${taskId}/download`"
              class="flex items-center gap-2 px-4 py-2 rounded-lg border border-border-default text-secondary hover:bg-elevated hover:text-primary text-sm font-medium transition-colors duration-150"
            >
              <Download :size="16" />
              下载代码
            </a>
          </div>

          <!-- GitHub 推送成功 -->
          <div
            v-if="taskStore.currentTask.githubRepo"
            class="mt-3 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-sm"
          >
            已推送到 GitHub：
            <a
              :href="taskStore.currentTask.githubRepo"
              target="_blank"
              class="underline ml-1"
            >
              {{ taskStore.currentTask.githubRepo }}
            </a>
          </div>
          <p v-if="pushError" class="mt-2 text-error text-xs">{{ pushError }}</p>
        </div>

        <!-- 右侧：文件树（完成后展示） -->
        <div
          v-if="isFinished"
          class="w-96 border-l border-border-default bg-surface overflow-auto"
        >
          <div class="px-4 py-3 border-b border-border-default">
            <h3 class="text-sm font-medium text-primary">生成文件</h3>
            <p class="text-xs text-muted mt-0.5">{{ taskStore.currentFiles.length }} 个文件</p>
          </div>

          <div v-if="taskStore.currentFiles.length === 0" class="flex items-center justify-center py-10">
            <div class="flex flex-col items-center gap-2">
              <RefreshCw :size="20" class="text-muted animate-spin" />
              <p class="text-muted text-xs">加载文件列表...</p>
            </div>
          </div>

          <ul v-else class="py-2">
            <li
              v-for="file in taskStore.currentFiles"
              :key="file.id"
              class="flex items-center gap-2.5 px-4 py-2 hover:bg-elevated transition-colors duration-150 cursor-pointer group"
            >
              <FileCode2 :size="14" class="text-muted flex-shrink-0" />
              <span class="text-secondary text-xs font-mono flex-1 truncate group-hover:text-primary">
                {{ file.path }}
              </span>
              <ChevronRight :size="12" class="text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
            </li>
          </ul>
        </div>
      </div>
    </template>
  </AppLayout>
</template>
