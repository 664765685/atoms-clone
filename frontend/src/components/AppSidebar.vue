<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'
import { Bot, Home, Settings, Github, Plus } from 'lucide-vue-next'

const router = useRouter()
const route = useRoute()

/** 导航菜单项 */
type NavItem = {
  label: string
  to: string
  icon: typeof Home
}

const navItems: NavItem[] = [
  { label: '首页', to: '/', icon: Home },
  { label: '设置', to: '/settings', icon: Settings },
]

/**
 * 判断当前路由是否激活
 * @param to 路由路径
 */
function isActive(to: string): boolean {
  if (to === '/') {
    return route.path === '/'
  }
  return route.path.startsWith(to)
}
</script>

<template>
  <aside class="w-64 bg-base flex flex-col border-r border-border-default h-full">
    <!-- Logo 区域 -->
    <div class="flex items-center gap-3 px-5 h-14 border-b border-border-default">
      <div class="flex items-center justify-center w-8 h-8 rounded-lg bg-accent-light">
        <Bot :size="18" class="text-accent" />
      </div>
      <span class="text-primary font-semibold text-sm tracking-tight">Agent Studio</span>
    </div>

    <!-- 新建按钮 -->
    <div class="px-3 pt-4 pb-2">
      <button
        class="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-accent hover:bg-accent-hover text-white text-sm font-medium transition-colors duration-150"
        @click="router.push('/tasks/new')"
      >
        <Plus :size="16" />
        新建项目
      </button>
    </div>

    <!-- 导航菜单 -->
    <nav class="flex-1 px-3 pt-2 space-y-0.5">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors duration-150"
        :class="
          isActive(item.to)
            ? 'bg-overlay text-primary'
            : 'text-secondary hover:bg-overlay hover:text-primary'
        "
      >
        <component :is="item.icon" :size="16" />
        {{ item.label }}
      </RouterLink>
    </nav>

    <!-- 底部 GitHub 链接 -->
    <div class="px-3 pb-4">
      <a
        href="https://github.com"
        target="_blank"
        rel="noopener noreferrer"
        class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-secondary hover:bg-overlay hover:text-primary transition-colors duration-150"
      >
        <Github :size="16" />
        GitHub
      </a>
    </div>
  </aside>
</template>
