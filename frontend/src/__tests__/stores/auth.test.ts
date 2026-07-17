import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'

// Mock authApi
vi.mock('@/api/auth', () => ({
  authApi: {
    login: vi.fn().mockResolvedValue({
      token: 'test-token',
      user: { id: 1, username: 'admin', name: '管理员', role: 'admin' },
    }),
    logout: vi.fn().mockResolvedValue({}),
    getProfile: vi.fn().mockResolvedValue({
      id: 1,
      username: 'admin',
      name: '管理员',
      role: 'admin',
    }),
  },
}))

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
  })

  it('应该初始化为空状态', () => {
    const store = useAuthStore()
    expect(store.token).toBe('')
    expect(store.user).toBeNull()
  })

  it('应该成功登录', async () => {
    const store = useAuthStore()
    await store.login({ username: 'admin', password: 'admin123' })
    
    expect(store.token).toBe('test-token')
    expect(store.user).toBeTruthy()
    expect(store.user?.username).toBe('admin')
    expect(localStorage.setItem).toHaveBeenCalledWith('token', 'test-token')
  })

  it('应该成功登出', async () => {
    const store = useAuthStore()
    store.token = 'test-token'
    store.user = { id: 1, username: 'admin', name: '管理员', role: 'admin' }
    
    await store.logout()
    
    expect(store.token).toBe('')
    expect(store.user).toBeNull()
    expect(localStorage.removeItem).toHaveBeenCalledWith('token')
  })

  it('应该获取用户信息', async () => {
    const store = useAuthStore()
    store.token = 'test-token'
    
    await store.getProfile()
    
    expect(store.user).toBeTruthy()
    expect(store.user?.username).toBe('admin')
  })
})
