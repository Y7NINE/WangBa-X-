import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

import { useAuthStore } from '@/stores/auth'
import { createAccessGuard } from './access-guard'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/login/index.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/views/layout/index.vue'),
    redirect: '/dashboard',
    children: [
      {
        path: 'dashboard',
        name: 'Dashboard',
        component: () => import('@/views/dashboard/index.vue'),
        meta: { title: '数据大盘', icon: 'DataBoard' },
      },
      {
        path: 'seats',
        name: 'Seats',
        component: () => import('@/views/seats/index.vue'),
        meta: { title: '座位管理', icon: 'Grid' },
      },
      {
        path: 'faults',
        name: 'Faults',
        component: () => import('@/views/faults/index.vue'),
        meta: { title: '故障管理', icon: 'Warning' },
      },
      {
        path: 'billing',
        name: 'Billing',
        component: () => import('@/views/billing/index.vue'),
        meta: { title: '计费管理', icon: 'Money' },
      },
      {
        path: 'users',
        name: 'Users',
        component: () => import('@/views/users/index.vue'),
        meta: { title: '用户管理', icon: 'User' },
      },
      {
        path: 'cleaning',
        name: 'Cleaning',
        component: () => import('@/views/cleaning/index.vue'),
        meta: { title: '保洁管理', icon: 'Brush' },
      },
      {
        path: 'shifts',
        name: 'Shifts',
        component: () => import('@/views/shifts/index.vue'),
        meta: { title: '交接班', icon: 'Switch' },
      },
      {
        path: 'bounty',
        name: 'Bounty',
        component: () => import('@/views/bounty/index.vue'),
        meta: { title: '悬赏任务', icon: 'Trophy' },
      },
      {
        path: 'wakeup',
        name: 'Wakeup',
        component: () => import('@/views/wakeup/index.vue'),
        meta: { title: '智能唤醒', icon: 'AlarmClock' },
      },
      {
        path: 'orders',
        name: 'Orders',
        component: () => import('@/views/orders/index.vue'),
        meta: { title: '水吧订单', icon: 'Coffee' },
      },
      {
        path: 'reports',
        name: 'Reports',
        component: () => import('@/views/reports/index.vue'),
        meta: { title: '数据报表', icon: 'DataAnalysis' },
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/settings/index.vue'),
        meta: { title: '系统设置', icon: 'Setting' },
      },
    ],
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(to => createAccessGuard(useAuthStore())(to))

export default router
