import api from './index'

export interface Session {
  id: number
  userId: number
  machineId: string
  startTime: string
  endTime?: string
  duration: number
  amount: number
  status: string
}

export interface Transaction {
  id: number
  userId: number
  type: string
  amount: number
  balanceAfter: number
  paymentMethod?: string
  description?: string
  createdAt: string
}

export const billingApi = {
  // 获取当前会话
  getActiveSessions() {
    return api.get<Session[]>('/billing/sessions', { params: { status: 'active' } })
  },
  
  // 开始会话
  startSession(userId: number, machineId: string) {
    return api.post<Session>('/billing/sessions', { userId, machineId })
  },
  
  // 结束会话
  endSession(id: number) {
    return api.patch<Session>(`/billing/sessions/${id}/end`)
  },
  
  // 暂停会话
  pauseSession(id: number) {
    return api.patch(`/billing/sessions/${id}/pause`)
  },
  
  // 恢复会话
  resumeSession(id: number) {
    return api.patch(`/billing/sessions/${id}/resume`)
  },
  
  // 获取交易记录
  getTransactions(params?: { userId?: number; type?: string }) {
    return api.get<Transaction[]>('/billing/transactions', { params })
  },
  
  // 充值
  recharge(userId: number, amount: number, paymentMethod: string) {
    return api.post('/billing/recharge', { userId, amount, paymentMethod })
  },
}
