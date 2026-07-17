import api from './index'

export interface FaultTicket {
  id: string
  machineId: string
  faultType: string
  faultCategory: string
  source: string
  priority: string
  status: string
  description?: string
  playerAction?: string
  handlerId?: number
  createdAt: string
  timeoutAt?: string
}

export interface CreateFaultParams {
  machineId: string
  faultType: string
  description?: string
  playerAction?: string
}

export const faultApi = {
  // 获取故障工单列表
  getTickets(params?: { status?: string; priority?: string }) {
    return api.get<FaultTicket[]>('/faults/tickets', { params })
  },
  
  // 获取单个工单
  getTicket(id: string) {
    return api.get<FaultTicket>(`/faults/tickets/${id}`)
  },
  
  // 创建工单
  createTicket(data: CreateFaultParams) {
    return api.post<FaultTicket>('/faults/tickets', data)
  },
  
  // 接单
  acceptTicket(id: string) {
    return api.patch(`/faults/tickets/${id}/accept`)
  },
  
  // 标记修复
  resolveTicket(id: string, data: { resolution: string; note?: string }) {
    return api.patch(`/faults/tickets/${id}/resolve`, data)
  },
  
  // 申请换机
  transferTicket(id: string, newMachineId: string) {
    return api.patch(`/faults/tickets/${id}/transfer`, { newMachineId })
  },
  
  // 获取故障类型
  getFaultTypes() {
    return api.get('/faults/types')
  },
}
