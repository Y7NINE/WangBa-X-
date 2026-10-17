import api from './index'

export interface Machine {
  id: string
  areaId: number
  status: string
  currentUserId?: number
  positionX?: number | null
  positionY?: number | null
}

export interface Area {
  id: number
  name: string
  pricePerHour: number
}

export const machineApi = {
  getMachines(params?: { areaId?: number }) {
    return api.get<Machine[]>('/machines', { params })
  },
  getMachine(id: string) {
    return api.get<Machine>(`/machines/${id}`)
  },
  getAreas() {
    return api.get<Area[]>('/areas')
  },
}
