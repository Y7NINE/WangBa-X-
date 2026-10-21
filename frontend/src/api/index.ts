import axios, { type AxiosRequestConfig } from 'axios'
import { ElMessage } from 'element-plus'

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截器
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// 响应拦截器
api.interceptors.response.use(
  (response) => {
    return response.data
  },
  (error) => {
    const message = error.response?.data?.message || '请求失败'
    if (!error.config?.silentError) ElMessage.error(message)

    const currentToken = localStorage.getItem('token')
    if (error.response?.status === 401 && currentToken && error.config?.headers?.Authorization === `Bearer ${currentToken}`) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  }
)

interface ApiConfig extends AxiosRequestConfig { silentError?: boolean }
interface ApiClient {
  get<T = any>(url: string, config?: ApiConfig): Promise<T>
  post<T = any>(url: string, data?: unknown, config?: ApiConfig): Promise<T>
  patch<T = any>(url: string, data?: unknown, config?: ApiConfig): Promise<T>
  put<T = any>(url: string, data?: unknown, config?: ApiConfig): Promise<T>
  delete<T = any>(url: string, config?: ApiConfig): Promise<T>
}
export default api as unknown as ApiClient
