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

  it('createOrder sends fixed request ID and product quantities without client pricing', async () => {
    apiMock.post.mockResolvedValue({ id: 1, status: 'pending', total: 24 })
    const items = [
      { itemId: 1, qty: 1 },
      { itemId: 5, qty: 1 },
    ]
    const r = await orderApi.createOrder({
      requestId: 'a03f9fd2-24e9-4ba7-883c-a3760f9c8b15',
      items,
    })

    expect(apiMock.post).toHaveBeenCalledWith('/orders', {
      requestId: 'a03f9fd2-24e9-4ba7-883c-a3760f9c8b15',
      items,
    })
    expect(r.id).toBe(1)
  })

  it('confirms a previous request by its fixed ID', async () => {
    apiMock.get.mockResolvedValue({ id: 1 })
    await orderApi.getRequestResult('request-id')
    expect(apiMock.get).toHaveBeenCalledWith('/orders/requests/request-id')
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
