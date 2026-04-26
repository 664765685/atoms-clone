<script setup lang="ts">
import { computed } from 'vue'
import { FileText, Layout, Code2, TestTube, Check } from 'lucide-vue-next'
import type { AgentRole } from '../types'

type Props = {
  /** 当前正在执行的 Agent（null 表示未开始或已结束） */
  currentAgent?: AgentRole | null
  /** 已完成的 Agent 列表 */
  completedAgents?: AgentRole[]
}

const props = withDefaults(defineProps<Props>(), {
  currentAgent: null,
  completedAgents: () => [],
})

/** Agent 步骤配置 */
type StepConfig = {
  role: AgentRole
  label: string
  description: string
  icon: typeof FileText
}

const steps: StepConfig[] = [
  {
    role: 'pm',
    label: 'PM',
    description: '需求分析',
    icon: FileText,
  },
  {
    role: 'architect',
    label: 'Architect',
    description: '架构设计',
    icon: Layout,
  },
  {
    role: 'engineer',
    label: 'Engineer',
    description: '代码生成',
    icon: Code2,
  },
  {
    role: 'qa',
    label: 'QA',
    description: '质量检测',
    icon: TestTube,
  },
]

/**
 * 获取步骤状态
 * @param role Agent 角色
 */
function getStepStatus(role: AgentRole): 'done' | 'running' | 'pending' {
  if (props.completedAgents.includes(role)) return 'done'
  if (props.currentAgent === role) return 'running'
  return 'pending'
}

const currentStepIndex = computed(() => {
  if (!props.currentAgent) return -1
  return steps.findIndex((s) => s.role === props.currentAgent)
})
</script>

<template>
  <div class="w-full px-6 py-4 bg-surface border-b border-border-default">
    <div class="flex items-center justify-between max-w-2xl mx-auto">
      <template v-for="(step, index) in steps" :key="step.role">
        <!-- 步骤节点 -->
        <div class="flex flex-col items-center gap-2">
          <!-- 图标圆圈 -->
          <div
            class="flex items-center justify-center w-9 h-9 rounded-full border-2 transition-all duration-200"
            :class="{
              'border-success bg-success/20 text-success': getStepStatus(step.role) === 'done',
              'border-accent bg-accent-light text-accent': getStepStatus(step.role) === 'running',
              'border-border-default bg-elevated text-muted': getStepStatus(step.role) === 'pending',
            }"
          >
            <Check v-if="getStepStatus(step.role) === 'done'" :size="16" />
            <component
              v-else
              :is="step.icon"
              :size="16"
              :class="getStepStatus(step.role) === 'running' ? 'animate-pulse' : ''"
            />
          </div>
          <!-- 步骤标签 -->
          <div class="text-center">
            <p
              class="text-xs font-medium"
              :class="{
                'text-success': getStepStatus(step.role) === 'done',
                'text-accent': getStepStatus(step.role) === 'running',
                'text-muted': getStepStatus(step.role) === 'pending',
              }"
            >
              {{ step.label }}
            </p>
            <p class="text-xs text-muted">{{ step.description }}</p>
          </div>
        </div>

        <!-- 连接线（最后一个不显示） -->
        <div
          v-if="index < steps.length - 1"
          class="flex-1 h-px mx-3 transition-colors duration-200"
          :class="
            index < currentStepIndex || completedAgents.length > index
              ? 'bg-accent/40'
              : 'bg-border-default'
          "
        />
      </template>
    </div>
  </div>
</template>
