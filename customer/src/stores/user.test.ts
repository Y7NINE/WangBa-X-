import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useUserStore } from '@/stores/user'

const mockToken = 'jwt-token-1'
const mockUser = {
  id: 1,
  phone: '13800001111',
  nickname: '用户1111',
  balance: 10,
  credits: 0,
  memberLevel: 'normal',
}

const mockSession = {
  id: 9,
  userId: 1,
  machineId: 'A-01',
  startTime: '2026-10-17T01:00:00.000Z',
  duration: 30,
  amount: 5,
  status: 'active',
}

vi.mock('@/api', () => {
  const post = vi.fn()
  const get = vi.fn()
  const patch = vi.fn()
  return {
    default: { post, get, patch },
    __mocks: { post, get, patch },
  }
})

import api from '@/api'

const apiMock = api as unknown as {
  post: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  patch: ReturnType<typeof vi.fn>
}

describe('user store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    localStorage.clear()
    apiMock.post.mockReset()
    apiMock.get.mockReset()
    apiMock.patch.mockReset()
    apiMock.get.mockImplementation((url: string) => {
      if (url === '/billing/sessions') return Promise.resolve([mockSession])
      return Promise.resolve(mockUser)
    })
    apiMock.post.mockResolvedValue({ token: mockToken, user: mockUser })
    apiMock.patch.mockResolvedValue({ id: 9, amount: 8, status: 'completed' })
  })

  it('loginByPhone stores token and loads current session', async () => {
    const store = useUserStore()
    await store.loginByPhone('13800001111', '123456')

    expect(apiMock.post).toHaveBeenCalledWith('/auth/customer/login', {
      phone: '13800001111',
      code: '123456',
    })
    expect(store.token).toBe(mockToken)
    expect(store.user?.id).toBe(1)
    expect(store.currentSession?.machineId).toBe('A-01')
    expect(localStorage.getItem('customer_token')).toBe(mockToken)
  })

  it('rejects bad code', async () => {
    apiMock.post.mockRejectedValue(new Error('验证码错误'))
    const store = useUserStore()
    await expect(store.loginByPhone('13800001111', '000000')).rejects.toThrow('验证码错误')
  })

  it('endCurrentSession clears current session', async () => {
    const store = useUserStore()
    await store.loginByPhone('13800001111', '123456')
    const r = await store.endCurrentSession()
    expect(apiMock.patch).toHaveBeenCalledWith('/billing/sessions/9/end')
    expect(r.amount).toBe(8)
    expect(store.currentSession).toBeNull()
  })

  it('logout clears local state', async () => {
    const store = useUserStore()
    await store.loginByPhone('13800001111', '123456')
    apiMock.post.mockResolvedValue({ message: 'ok' })
    await store.logout()
    expect(store.user).toBeNull()
    expect(store.token).toBe('')
    expect(localStorage.getItem('customer_token')).toBeNull()
  })
  it('temporary session refresh failure preserves the current session', async () => {
    const store = useUserStore()
    await store.loginByPhone('13800001111', '123456')
    apiMock.get.mockRejectedValue(new Error('network unavailable'))
    await store.loadCurrentSession()
    expect(store.currentSession?.id).toBe(mockSession.id)
  })

  it('expired authentication clears the stored token', async () => {
    const store = useUserStore()
    await store.loginByPhone('13800001111', '123456')
    apiMock.get.mockRejectedValue(Object.assign(new Error('expired'), { status: 401 }))
    await store.restoreSession()
    expect(store.token).toBe('')
    expect(store.currentSession).toBeNull()
    expect(localStorage.getItem('customer_token')).toBeNull()
  })

  it('temporary profile failure does not log out the customer', async () => {
    const store = useUserStore()
    await store.loginByPhone('13800001111', '123456')
    apiMock.get.mockRejectedValue(new Error('network unavailable'))
    await store.restoreSession()
    expect(store.token).toBe(mockToken)
    expect(store.user?.id).toBe(mockUser.id)
  })

})
