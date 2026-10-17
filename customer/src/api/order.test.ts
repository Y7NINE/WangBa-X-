import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('@/api', () => {
  const post = vi.fn()
  const get = vi.fn()
  const patch = vi.fn()
  return {
    default: { post, get, patch },
  }
})

import api from '@/api'
import { orderApi } from '@/api/order'

const apiMock = api as unknown as {
  post: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  patch: ReturnType<typeof vi.fn>
}

describe('orderApi', () => {
  beforeEach(() => {
    apiMock.post.mockReset()
    apiMock.get.mockReset()
    apiMock.patch.mockReset()
  })

  it('createOrder serializes items and posts /orders', async () => {
    apiMock.post.mockResolvedValue({ id: 1, status: 'pending', total: 24 })
    const items = [
      { itemId: 1, name: '冰美式', price: 18, qty: 1 },
      { itemId: 5, name: '可乐', price: 6, qty: 1 },
    ]
    const r = await orderApi.createOrder({
      userId: 1,
      machineId: 'A-01',
      items,
      total: 24,
    })

    expect(apiMock.post).toHaveBeenCalledWith('/orders', {
      userId: 1,
      machineId: 'A-01',
      items: JSON.stringify(items),
      total: 24,
    })
    expect(r.id).toBe(1)
  })

  it('getOrders supports status filter', async () => {
    apiMock.get.mockResolvedValue([])
    await orderApi.getOrders('pending')
    expect(apiMock.get).toHaveBeenCalledWith('/orders', { params: { status: 'pending' } })

    await orderApi.getOrders()
    expect(apiMock.get).toHaveBeenLastCalledWith('/orders', { params: {} })
  })

  it('updateOrderStatus patches status', async () => {
    apiMock.patch.mockResolvedValue({ id: 1, status: 'completed' })
    await orderApi.updateOrderStatus(1, 'completed')
    expect(apiMock.patch).toHaveBeenCalledWith('/orders/1/status', { status: 'completed' })
  })
})
