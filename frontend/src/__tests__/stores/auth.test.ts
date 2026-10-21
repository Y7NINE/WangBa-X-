import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import type { StaffProfile } from '@/api/auth'

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
    vi.clearAllMocks()
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

  it('临时网络失败保留令牌和已有身份', async () => {
    const store = useAuthStore()
    store.token = 'token'
    store.user = { id: 1, username: 'admin', name: '店长', role: 'admin' }
    vi.mocked(authApi.getProfile).mockRejectedValueOnce(new Error('offline'))
    await expect(store.getProfile()).rejects.toThrow('offline')
    expect(store.token).toBe('token')
    expect(store.user?.role).toBe('admin')
  })

  it.each([401, 403])('身份查询返回 %s 时清除会话', async status => {
    const store = useAuthStore()
    store.token = 'token'
    vi.mocked(authApi.getProfile).mockRejectedValueOnce({ response: { status } })
    await expect(store.getProfile()).rejects.toEqual({ response: { status } })
    expect(store.token).toBe('')
    expect(store.user).toBeNull()
  })

  it('并发加载身份复用同一个请求', async () => {
    const store = useAuthStore()
    store.token = 'token'
    let finish!: (value: StaffProfile) => void
    vi.mocked(authApi.getProfile).mockImplementationOnce(() => new Promise<StaffProfile>(resolve => { finish = resolve }))
    const first = store.getProfile()
    const second = store.getProfile()
    expect(authApi.getProfile).toHaveBeenCalledTimes(1)
    finish({ id: 4, username: 'tech', name: '技师', role: 'technician' })
    await Promise.all([first, second])
    expect(store.user?.role).toBe('technician')
  })

  it('退出后返回的旧身份请求不会恢复会话', async () => {
    const store = useAuthStore()
    store.token = 'old-token'
    let finish!: (value: StaffProfile) => void
    vi.mocked(authApi.getProfile).mockImplementationOnce(() => new Promise<StaffProfile>(resolve => { finish = resolve }))
    const pending = store.getProfile()
    await store.logout()
    finish({ id: 1, username: 'admin', name: '店长', role: 'admin' })
    await pending
    expect(store.token).toBe('')
    expect(store.user).toBeNull()
  })

  it('非法员工角色不会被保存为有效身份', async () => {
    const store = useAuthStore()
    store.token = 'token'
    vi.mocked(authApi.getProfile).mockResolvedValueOnce({ id: 1, username: 'fake', name: 'fake', role: 'owner' })
    await expect(store.getProfile()).rejects.toThrow('员工身份无效')
    expect(store.token).toBe('')
  })
})
