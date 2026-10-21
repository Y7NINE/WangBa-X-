import { defineStore } from 'pinia'
import { ref } from 'vue'
import { authApi, type LoginParams, type StaffProfile } from '@/api/auth'
import { isStaffRole } from '@/access'

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string>(localStorage.getItem('token') || '')
  const user = ref<StaffProfile | null>(null)
  let profileRequest: Promise<StaffProfile | undefined> | undefined
  let profileToken: string | undefined

  function clearSession() {
    token.value = ''
    user.value = null
    localStorage.removeItem('token')
  }
  function validateProfile(profile: StaffProfile) {
    if (!profile || !isStaffRole(profile.role) || !Number.isSafeInteger(profile.id) || profile.id < 1) {
      throw new Error('员工身份无效，请重新登录')
    }
  }
  
  async function login(params: LoginParams) {
    const result = await authApi.login(params)
    validateProfile(result.user)
    token.value = result.token
    user.value = result.user
    localStorage.setItem('token', result.token)
    return result
  }
  
  async function logout() {
    try {
      await authApi.logout()
    } finally {
      clearSession()
    }
  }
  
  async function getProfile() {
    if (!token.value) return
    if (profileRequest && profileToken === token.value) return profileRequest
    const requestedToken = token.value
    const request: Promise<StaffProfile | undefined> = authApi.getProfile().then(result => {
      if (token.value !== requestedToken) return undefined
      try { validateProfile(result) } catch (error) { clearSession(); throw error }
      user.value = result
      return result
    }).catch(error => {
      const status = error.response?.status ?? error.status
      if (token.value === requestedToken && [401, 403].includes(status)) clearSession()
      throw error
    }).finally(() => {
      if (profileRequest === request) { profileRequest = undefined; profileToken = undefined }
    })
    profileToken = requestedToken
    profileRequest = request
    return request
  }
  
  return {
    token,
    user,
    login,
    logout,
    getProfile,
    clearSession,
  }
})
