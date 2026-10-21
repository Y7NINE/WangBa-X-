import api from './index'

export interface Session {
  settlementRequestedAt?: string | null
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
  requestId?: string
  operatorId?: number
}

export interface RechargeCommand {
  requestId: string
  userId: number
  amount: number
  paymentMethod: string
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
    return api.patch<Session>(`/billing/sessions/${id}/end`, undefined, { silentError: true })
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
  recharge(command: RechargeCommand) {
    return api.post<Transaction>('/billing/recharge', command, { silentError: true })
  },
  getRechargeResult(requestId: string) {
    return api.get<Transaction>(`/billing/recharges/${requestId}`, { silentError: true })
  },
}
