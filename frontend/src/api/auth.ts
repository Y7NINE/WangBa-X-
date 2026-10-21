import api from './index'

export interface LoginParams {
  username: string
  password: string
}

export interface StaffProfile {
    id: number
    username: string
    name: string
    role: string
}

export interface LoginResult {
  token: string
  user: StaffProfile
}

export const authApi = {
  login(params: LoginParams): Promise<LoginResult> {
    return api.post('/auth/login', params)
  },
  
  logout() {
    return api.post('/auth/logout')
  },
  
  getProfile() {
    return api.get<StaffProfile>('/auth/profile')
  },
}
