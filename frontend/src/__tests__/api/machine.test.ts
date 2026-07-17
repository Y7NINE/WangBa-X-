import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock axios
const mockGet = vi.fn()
const mockPost = vi.fn()
const mockPatch = vi.fn()

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      get: mockGet,
      post: mockPost,
      patch: mockPatch,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    })),
  },
}))

describe('Machine API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('应该调用获取机器列表接口', async () => {
    mockGet.mockResolvedValue({
      data: [
        { id: 'A-01', status: 'offline' },
        { id: 'A-02', status: 'online' },
      ],
    })
    
    const { machineApi } = await import('@/api/machine')
    
    await machineApi.getMachines()
    
    expect(mockGet).toHaveBeenCalled()
  })

  it('应该调用获取区域列表接口', async () => {
    mockGet.mockResolvedValue({
      data: [
        { id: 1, name: '竞技区' },
        { id: 2, name: '休闲区' },
      ],
    })
    
    const { machineApi } = await import('@/api/machine')
    
    await machineApi.getAreas()
    
    expect(mockGet).toHaveBeenCalled()
  })
})
