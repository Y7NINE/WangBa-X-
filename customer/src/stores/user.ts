import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api from '@/api'

interface User {
  id: number
  phone: string
  nickname: string
  avatar?: string
  balance: number
  credits: number
  memberLevel: string
}

export interface Session {
  userId: number
  id: number
  machineId: string
  startTime: string
  endTime?: string
  duration: number
  amount: number
  status: string
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const currentSession = ref<Session | null>(null)
  const token = ref(localStorage.getItem('customer_token') || '')

  const isLoggedIn = computed(() => !!user.value)

  async function loginByPhone(phone: string, code: string = '123456') {
    const data = await api.post('/auth/customer/login', { phone, code })
    token.value = data.token
    user.value = data.user
    localStorage.setItem('customer_token', token.value)
    await loadCurrentSession()
  }

  async function refreshProfile() {
    if (!token.value) return
    user.value = await api.get('/auth/customer/profile')
  }

  async function restoreSession() {
    if (!token.value) return
    try {
      user.value = await api.get('/auth/customer/profile')
      await loadCurrentSession()
    } catch (error: any) {
      if (error?.status !== 401) return
      token.value = ''
      user.value = null
      currentSession.value = null
      localStorage.removeItem('customer_token')
    }
  }

  async function loadCurrentSession() {
    if (!user.value) return
    try {
      const sessions = await api.get('/billing/sessions')
      const list = Array.isArray(sessions) ? sessions : []
      currentSession.value =
        list.find((s: Session) => s.userId === user.value!.id && s.status === 'active') ||
        list.find((s: Session) => s.userId === user.value!.id && s.status === 'paused') ||
        null
    } catch {
      // A temporary network error must not erase a known live session.
    }
  }

  async function endCurrentSession() {
    if (!currentSession.value) return null
    const r = await api.patch(`/billing/sessions/${currentSession.value.id}/end`)
    currentSession.value = null
    await refreshProfile()
    return r
  }

  async function logout() {
    try {
      if (token.value) {
        await api.post('/auth/customer/logout')
      }
    } catch (error) {
      console.warn('退出登录请求失败', error)
    }
    user.value = null
    currentSession.value = null
    token.value = ''
    localStorage.removeItem('customer_token')
  }

  return {
    user,
    currentSession,
    token,
    isLoggedIn,
    loginByPhone,
    restoreSession,
    refreshProfile,
    loadCurrentSession,
    endCurrentSession,
    logout,
  }
})
