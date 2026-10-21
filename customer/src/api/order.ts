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
  requestId?: string
  createdById?: number
  createdByType?: string
}

export interface OrderCommand {
  requestId: string
  items: { itemId: number; qty: number }[]
  remark?: string
}

export const orderApi = {
  createOrder(data: OrderCommand) {
    return api.post<Order>('/orders', data)
  },
  getRequestResult(requestId: string) {
    return api.get<Order>(`/orders/requests/${requestId}`)
  },
  getOrders(status?: string) {
    return api.get<Order[]>('/orders', { params: status ? { status } : {} })
  },
  updateOrderStatus(id: number, status: string) {
    return api.patch<Order>(`/orders/${id}/status`, { status })
  },
}
