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

export interface CreateUserInput {
  nickname: string
  phone?: string
  avatar?: string
}

export interface UpdateUserInput {
  nickname?: string
  phone?: string
  avatar?: string
  isActive?: boolean
}

export const userApi = {
  getUsers() {
    return api.get<User[]>('/users')
  },
  getUser(id: number) {
    return api.get<User>(`/users/${id}`)
  },
  createUser(data: CreateUserInput) {
    return api.post<User>('/users', data)
  },
  updateUser(id: number, data: UpdateUserInput) {
    return api.patch<User>(`/users/${id}`, data)
  },
  deleteUser(id: number) {
    return api.delete(`/users/${id}`)
  },
}
