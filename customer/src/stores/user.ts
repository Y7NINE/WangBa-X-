import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface User {
  id: number
  nickname: string
  phone: string
  balance: number
  credits: number
  memberLevel: string
}

interface Session {
  id: number
  machineId: string
  startTime: string
  duration: number
  amount: number
  status: string
}

export const useUserStore = defineStore('user', () => {
  const user = ref<User | null>(null)
  const currentSession = ref<Session | null>(null)
  const token = ref(localStorage.getItem('customer_token') || '')

  const isLoggedIn = computed(() => !!user.value)

  async function loginByPhone(phone: string) {
    // 模拟登录
    const response = await fetch(`/api/users/phone/${phone}`)
    if (response.ok) {
      const userData = await response.json()
      user.value = userData
      token.value = 'mock_token'
      localStorage.setItem('customer_token', token.value)
    } else {
      // 创建新用户
      const createResponse = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, nickname: `用户${phone.slice(-4)}` })
      })
      if (createResponse.ok) {
        user.value = await createResponse.json()
        token.value = 'mock_token'
        localStorage.setItem('customer_token', token.value)
      }
    }
  }

  function logout() {
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
    logout,
  }
})
