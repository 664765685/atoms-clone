import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../pages/HomePage.vue'),
  },
  {
    path: '/tasks/new',
    name: 'TaskNew',
    component: () => import('../pages/TaskNewPage.vue'),
  },
  {
    path: '/tasks/:id',
    name: 'TaskDetail',
    component: () => import('../pages/TaskDetailPage.vue'),
  },
  {
    path: '/settings',
    name: 'Settings',
    component: () => import('../pages/SettingsPage.vue'),
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

export default router
