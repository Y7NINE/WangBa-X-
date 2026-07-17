import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock axios
const mockPost = vi.fn()
const mockGet = vi.fn()

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      post: mockPost,
      get: mockGet,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}))

describe('Auth API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该调用登录接口', async () => {
    mockPost.mockResolvedValue({
      data: { token: 'test-token', user: { id: 1 } },
    })
    
    const { authApi } = await import('@/api/auth')
    
    await authApi.login({ username: 'admin', password: 'admin123' })
    
    expect(mockPost).toHaveBeenCalledWith('/auth/login', {
      username: 'admin',
      password: 'admin123',
    })
  })

  it('应该调用获取用户信息接口', async () => {
    mockGet.mockResolvedValue({
      data: { id: 1, username: 'admin' },
    })
    
    const { authApi } = await import('@/api/auth')
    
    await authApi.getProfile()
    
    expect(mockGet).toHaveBeenCalledWith('/auth/profile')
  })
})
