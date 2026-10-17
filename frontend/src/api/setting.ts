import api from './index'

export interface ShopSetting {
  id: number
  shopName: string
  phone: string
  openTime: string
  closeTime: string
  defaultRate: number
  nightRate: number
  nightStart: string
  nightEnd: string
  heartbeatTimeout: number
  notifyMethods: string
  createdAt: string
  updatedAt: string
}

export const settingApi = {
  getSettings() {
    return api.get<ShopSetting>('/settings')
  },
  updateSettings(data: Partial<ShopSetting>) {
    return api.put<ShopSetting>('/settings', data)
  },
}
