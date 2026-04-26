<script setup lang="ts">
import AppSidebar from './AppSidebar.vue'
</script>

<template>
  <div class="flex h-screen bg-base overflow-hidden">
    <!-- 侧边栏 -->
    <AppSidebar />

    <!-- 右侧内容区 -->
    <div class="flex flex-col flex-1 overflow-hidden">
      <!-- Topbar -->
      <header class="h-14 bg-surface border-b border-border-default flex items-center px-6 flex-shrink-0">
        <div class="flex-1">
          <!-- Topbar 内容由各页面通过 slot 注入，或保持空白 -->
          <slot name="topbar" />
        </div>
      </header>

      <!-- 主内容区 -->
      <main class="flex-1 overflow-auto bg-base">
        <slot />
      </main>
    </div>
  </div>
</template>
