import { useUserStore } from '@/stores/user'
import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home.vue'),
    meta: { title: '首页' },
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { title: '登录' },
  },
  {
    path: '/seats',
    name: 'Seats',
    component: () => import('@/views/Seats.vue'),
    meta: { title: '选座上机' },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/Profile.vue'),
    meta: { title: '个人中心' },
  },
  {
    path: '/repair',
    name: 'Repair',
    component: () => import('@/views/Repair.vue'),
    meta: { title: '一键报修' },
  },
  {
    path: '/menu',
    name: 'Menu',
    component: () => import('@/views/Menu.vue'),
    meta: { title: '水吧点单' },
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

router.beforeEach(async (to) => {
  const user = useUserStore()
  if (user.token && !user.isLoggedIn) await user.restoreSession()
  if (['/profile', '/repair'].includes(to.path) && !user.isLoggedIn) return '/login'
})

export default router
