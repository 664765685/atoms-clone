<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { FolderOpen, Plus } from 'lucide-vue-next'
import AppLayout from '../components/AppLayout.vue'
import TaskCard from '../components/TaskCard.vue'
import { useTaskStore } from '../stores/task'

const router = useRouter()
const taskStore = useTaskStore()

onMounted(() => {
  taskStore.fetchTasks()
})
</script>

<template>
  <AppLayout>
    <div class="max-w-6xl mx-auto px-6 py-8">
      <!-- 标题区 -->
      <div class="flex items-center justify-between mb-8">
        <div>
          <h1 class="text-2xl font-semibold text-primary">历史项目</h1>
          <p class="text-secondary text-sm mt-1">
            {{ taskStore.tasks.length > 0 ? `共 ${taskStore.tasks.length} 个项目` : '使用 AI 生成你的下一个项目' }}
          </p>
        </div>
        <button
          class="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors duration-150"
          @click="router.push('/tasks/new')"
        >
          <Plus :size="16" />
          新建项目
        </button>
      </div>

      <!-- 加载状态 -->
      <div v-if="taskStore.isLoadingList" class="flex items-center justify-center py-20">
        <div class="flex flex-col items-center gap-3">
          <div class="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
          <p class="text-secondary text-sm">加载中...</p>
        </div>
      </div>

      <!-- 错误状态 -->
      <div
        v-else-if="taskStore.error"
        class="flex items-center justify-center py-20"
      >
        <p class="text-error text-sm">{{ taskStore.error }}</p>
      </div>

      <!-- 空状态 -->
      <div
        v-else-if="taskStore.tasks.length === 0"
        class="flex flex-col items-center justify-center py-20 gap-4"
      >
        <div class="flex items-center justify-center w-16 h-16 rounded-2xl bg-surface">
          <FolderOpen :size="40" class="text-muted" />
        </div>
        <div class="text-center">
          <p class="text-primary font-medium mb-1">还没有项目</p>
          <p class="text-secondary text-sm">点击新建开始，让 AI 帮你生成代码</p>
        </div>
        <button
          class="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors duration-150"
          @click="router.push('/tasks/new')"
        >
          <Plus :size="16" />
          新建项目
        </button>
      </div>

      <!-- 任务网格列表 -->
      <div
        v-else
        class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        <TaskCard
          v-for="task in taskStore.tasks"
          :key="task.id"
          :task="task"
        />
      </div>
    </div>
  </AppLayout>
</template>
