<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-vue-next'
import type { Task, TaskStatus } from '../types'

type Props = {
  task: Task
}

const props = defineProps<Props>()
const router = useRouter()

/** 状态配置映射 */
const statusConfig: Record<
  TaskStatus,
  { label: string; textClass: string; bgClass: string; icon: typeof Clock }
> = {
  pending: {
    label: 'Pending',
    textClass: 'text-secondary',
    bgClass: 'bg-overlay',
    icon: Clock,
  },
  running: {
    label: 'Running',
    textClass: 'text-accent',
    bgClass: 'bg-accent-light',
    icon: Loader2,
  },
  done: {
    label: 'Done',
    textClass: 'text-success',
    bgClass: 'bg-success/20',
    icon: CheckCircle2,
  },
  failed: {
    label: 'Failed',
    textClass: 'text-error',
    bgClass: 'bg-error/20',
    icon: XCircle,
  },
}

const status = computed(() => statusConfig[props.task.status])

/**
 * 格式化时间戳
 * @param dateStr ISO 时间字符串
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 跳转到任务详情 */
function handleClick(): void {
  router.push(`/tasks/${props.task.id}`)
}
</script>

<template>
  <div
    class="bg-surface border border-border-default rounded-xl p-5 cursor-pointer hover:bg-elevated hover:border-border-strong transition-all duration-150 group"
    @click="handleClick"
  >
    <!-- 顶部：标题 + 状态 Badge -->
    <div class="flex items-start justify-between gap-3 mb-3">
      <h3 class="text-primary text-sm font-medium line-clamp-2 flex-1">
        {{ task.title }}
      </h3>
      <!-- 状态 Badge -->
      <span
        class="flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium flex-shrink-0"
        :class="[status.bgClass, status.textClass]"
      >
        <component
          :is="status.icon"
          :size="12"
          :class="task.status === 'running' ? 'animate-spin' : ''"
        />
        {{ status.label }}
      </span>
    </div>

    <!-- 需求描述 -->
    <p class="text-secondary text-xs line-clamp-2 mb-4 leading-relaxed">
      {{ task.requirement }}
    </p>

    <!-- 底部：时间 + 技术栈 -->
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-1.5 text-muted text-xs">
        <Clock :size="12" />
        {{ formatDate(task.createdAt) }}
      </div>
      <div class="flex items-center gap-1.5">
        <span class="text-xs text-muted bg-overlay px-2 py-0.5 rounded">
          {{ task.techStack.frontend }}
        </span>
      </div>
    </div>
  </div>
</template>
