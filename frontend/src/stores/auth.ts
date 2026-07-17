import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi, LoginParams } from '@/api/auth'

interface UserInfo {
  id: number
  username: string
  name: string
  role: string
}

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const user = ref<UserInfo | null>(null)
  
  async function login(params: LoginParams) {
    const result = await authApi.login(params)
    token.value = result.token
    user.value = result.user
    localStorage.setItem('token', result.token)
    return result
  }
  
  async function logout() {
    try {
      await authApi.logout()
    } finally {
      token.value = ''
      user.value = null
      localStorage.removeItem('token')
    }
  }
  
  async function getProfile() {
    if (!token.value) return
    try {
      const result = await authApi.getProfile()
      user.value = result as unknown as UserInfo
    } catch {
      token.value = ''
      user.value = null
      localStorage.removeItem('token')
    }
  }
  
  return {
    token,
    user,
    login,
    logout,
    getProfile,
  }
})
