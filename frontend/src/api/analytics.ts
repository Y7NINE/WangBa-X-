import api from './index'

export interface Overview {
  revenue: number
  sessions: number
  hours: number
  occupancyRate: number
  faultCount: number
  activeUsers: number
  revenueByDay: Array<{ date: string; revenue: number; sessions: number }>
}

export interface MachineStat {
  machineId: string
  areaName: string
  status: string
  revenue: number
  sessions: number
  hours: number
  occupancy: number
  faultCount: number
}

export interface AreaStat {
  areaId: number
  areaName: string
  machineCount: number
  revenue: number
  sessions: number
  hours: number
  occupancy: number
  avgPrice: number
  faultCount: number
}

export interface HourlyStat {
  hour: number
  sessions: number
  revenue: number
}

export interface FaultStat {
  byType: Array<{ type: string; count: number }>
  byStatus: Array<{ status: string; count: number }>
  avgResolveMinutes: number
}

export const analyticsApi = {
  getOverview(params?: { from?: string; to?: string }) {
    return api.get<Overview>('/analytics/overview', { params })
  },
  getMachines(params?: { from?: string; to?: string }) {
    return api.get<MachineStat[]>('/analytics/machines', { params })
  },
  getAreas(params?: { from?: string; to?: string }) {
    return api.get<AreaStat[]>('/analytics/areas', { params })
  },
  getHourly(date?: string) {
    return api.get<HourlyStat[]>('/analytics/hourly', { params: { date } })
  },
  getFaults(params?: { from?: string; to?: string }) {
    return api.get<FaultStat>('/analytics/faults', { params })
  },
}
