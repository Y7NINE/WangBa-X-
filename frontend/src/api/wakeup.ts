import api from './index'

export interface WakeUpConfig {
  id: number
  userId: number
  machineId: string
  wakeTime: string
  headphone: boolean
  lightStrip: boolean
  screen: boolean
  humanWake: boolean
  snoozeInterval: number
  maxSnooze: number
  status: string
  createdAt: string
  updatedAt: string
}

export const wakeupApi = {
  getConfigs() {
    return api.get<WakeUpConfig[]>('/wakeup/configs')
  },
  createConfig(data: Partial<WakeUpConfig>) {
    return api.post<WakeUpConfig>('/wakeup/configs', data)
  },
  cancelConfig(id: number) {
    return api.delete(`/wakeup/configs/${id}`)
  },
}
