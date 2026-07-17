import api from './index'

export interface Machine {
  id: string
  areaId: number
  status: string
  currentUserId?: number
  ipAddress?: string
  lastHeartbeat?: string
  faultType?: string
}

export interface Area {
  id: number
  name: string
  description?: string
  pricePerHour: number
  status: string
}

export const machineApi = {
  // 获取所有机器
  getMachines(params?: { areaId?: number; status?: string }) {
    return api.get<Machine[]>('/machines', { params })
  },
  
  // 获取单个机器
  getMachine(id: string) {
    return api.get<Machine>(`/machines/${id}`)
  },
  
  // 更新机器状态
  updateStatus(id: string, status: string) {
    return api.patch(`/machines/${id}/status`, { status })
  },
  
  // 获取所有区域
  getAreas() {
    return api.get<Area[]>('/areas')
  },
  
  // 获取区域详情
  getArea(id: number) {
    return api.get<Area>(`/areas/${id}`)
  },
}
