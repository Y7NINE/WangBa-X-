import api from './index'

export interface User {
  id: number
  phone?: string
  nickname: string
  avatar?: string
  balance: number
  bonusBalance: number
  credits: number
  memberLevel: string
  totalSpent: number
  totalHours: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export const userApi = {
  getUsers() {
    return api.get<User[]>('/users')
  },
  getUser(id: number) {
    return api.get<User>(`/users/${id}`)
  },
  createUser(data: Partial<User>) {
    return api.post<User>('/users', data)
  },
  updateUser(id: number, data: Partial<User>) {
    return api.patch<User>(`/users/${id}`, data)
  },
  deleteUser(id: number) {
    return api.delete(`/users/${id}`)
  },
}
