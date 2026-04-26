<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Play, Layers, Monitor, Server } from 'lucide-vue-next'
import AppLayout from '../components/AppLayout.vue'
import { createTask } from '../api/tasks'
import { useTaskStore } from '../stores/task'

const router = useRouter()
const taskStore = useTaskStore()

/** 需求描述输入 */
const requirement = ref<string>('')
/** 选中的技术栈索引 */
const selectedStack = ref<number>(0)
/** 提交加载状态 */
const isSubmitting = ref<boolean>(false)
/** 错误信息 */
const errorMsg = ref<string | null>(null)

/** 技术栈选项 */
type TechStackOption = {
  label: string
  description: string
  frontend: string
  backend: string
  icon: typeof Layers
  tags: string[]
}

const techStackOptions: TechStackOption[] = [
  {
    label: 'Vue3 + Node',
    description: '全栈项目，前端 Vue3，后端 Node.js + Express',
    frontend: 'Vue3',
    backend: 'Node.js + Express',
    icon: Layers,
    tags: ['Vue3', 'Node.js', 'Express', 'SQLite'],
  },
  {
    label: 'React + Express',
    description: '全栈项目，前端 React，后端 Express',
    frontend: 'React',
    backend: 'Node.js + Express',
    icon: Server,
    tags: ['React', 'Express', 'SQLite'],
  },
  {
    label: '纯前端 Vue3',
    description: '纯前端项目，Vue3 + Vite，无后端',
    frontend: 'Vue3',
    backend: 'none',
    icon: Monitor,
    tags: ['Vue3', 'Vite', 'TailwindCSS'],
  },
]

/**
 * 提交创建任务
 */
async function handleSubmit(): Promise<void> {
  if (!requirement.value.trim()) {
    errorMsg.value = '请描述你的项目需求'
    return
  }

  isSubmitting.value = true
  errorMsg.value = null

  try {
    const selected = techStackOptions[selectedStack.value]
    const task = await createTask({
      requirement: requirement.value.trim(),
      techStack: {
        frontend: selected.frontend,
        backend: selected.backend,
      },
    })

    // 更新 store
    taskStore.upsertTask(task)

    // 跳转到任务详情页
    router.push(`/tasks/${task.id}`)
  } catch (err) {
    errorMsg.value = err instanceof Error ? err.message : '创建任务失败，请重试'
    isSubmitting.value = false
  }
}
</script>

<template>
  <AppLayout>
    <div class="max-w-2xl mx-auto px-6 py-12">
      <!-- 大标题 -->
      <div class="mb-10 text-center">
        <h1 class="text-2xl font-semibold text-primary mb-2">描述你的想法</h1>
        <p class="text-secondary text-sm">
          告诉 AI 你想要构建什么，它会帮你生成完整的项目代码
        </p>
      </div>

      <!-- 需求输入区 -->
      <div class="mb-6">
        <label class="block text-sm font-medium text-secondary mb-2">项目需求</label>
        <textarea
          v-model="requirement"
          rows="6"
          class="w-full bg-surface border border-border-default rounded-xl px-4 py-3 text-primary text-sm placeholder-muted resize-none focus:outline-none focus:border-border-strong focus:ring-1 focus:ring-accent/30 transition-all duration-150"
          placeholder="例如：帮我做一个任务管理应用，支持创建/编辑/删除任务，按状态过滤，数据持久化到本地数据库..."
        />
        <p class="text-muted text-xs mt-1.5 text-right">{{ requirement.length }} 字</p>
      </div>

      <!-- 技术栈选择 -->
      <div class="mb-8">
        <label class="block text-sm font-medium text-secondary mb-3">技术栈</label>
        <div class="grid grid-cols-3 gap-3">
          <button
            v-for="(option, index) in techStackOptions"
            :key="option.label"
            class="flex flex-col items-start gap-2 p-4 rounded-xl border text-left transition-all duration-150"
            :class="
              selectedStack === index
                ? 'border-accent bg-accent-light text-primary'
                : 'border-border-default bg-surface text-secondary hover:border-border-strong hover:bg-elevated'
            "
            @click="selectedStack = index"
          >
            <component
              :is="option.icon"
              :size="20"
              :class="selectedStack === index ? 'text-accent' : 'text-muted'"
            />
            <div>
              <p class="text-sm font-medium" :class="selectedStack === index ? 'text-primary' : 'text-secondary'">
                {{ option.label }}
              </p>
              <p class="text-xs text-muted mt-0.5 leading-relaxed">
                {{ option.description }}
              </p>
            </div>
            <!-- Tags -->
            <div class="flex flex-wrap gap-1 mt-1">
              <span
                v-for="tag in option.tags"
                :key="tag"
                class="text-xs px-1.5 py-0.5 rounded bg-overlay text-muted"
              >
                {{ tag }}
              </span>
            </div>
          </button>
        </div>
      </div>

      <!-- 错误提示 -->
      <div
        v-if="errorMsg"
        class="mb-4 px-4 py-3 rounded-lg bg-error/10 border border-error/20 text-error text-sm"
      >
        {{ errorMsg }}
      </div>

      <!-- 提交按钮 -->
      <button
        class="w-full flex items-center justify-center gap-2.5 py-3 rounded-xl bg-accent hover:bg-accent-hover text-white font-medium text-sm transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        :disabled="isSubmitting"
        @click="handleSubmit"
      >
        <div
          v-if="isSubmitting"
          class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"
        />
        <Play v-else :size="16" />
        {{ isSubmitting ? '正在创建...' : '开始生成' }}
      </button>
    </div>
  </AppLayout>
</template>
