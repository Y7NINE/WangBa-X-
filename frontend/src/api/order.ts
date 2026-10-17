import api from './index'

export interface OrderItem {
  itemId: number
  name: string
  price: number
  qty: number
}

export interface Order {
  id: number
  userId?: number
  machineId?: string
  items: string
  total: number
  remark?: string
  status: string
  createdAt: string
  updatedAt: string
}

export const orderApi = {
  getOrders(status?: string) {
    return api.get<Order[]>('/orders', { params: status ? { status } : {} })
  },
  updateOrderStatus(id: number, status: string) {
    return api.patch<Order>(`/orders/${id}/status`, { status })
  },
  parseItems(raw: string): OrderItem[] {
    try {
      const list = JSON.parse(raw || '[]')
      return Array.isArray(list) ? list : []
    } catch {
      return []
    }
  },
}
