import { beforeEach, expect, it, vi } from 'vitest'
import { AxiosError, type AxiosInstance } from 'axios'
import api from '@/api'
import { ElMessage } from 'element-plus'

vi.mock('element-plus', () => ({ ElMessage: { error: vi.fn() } }))
const client = api as unknown as AxiosInstance
beforeEach(() => { localStorage.clear(); window.location.href = 'http://localhost/' })

it('由充值流程确认结果的请求不会提前弹出失败提示，普通请求仍提示', async () => {
  vi.mocked(ElMessage.error).mockClear()
  client.defaults.adapter = async config => {
    throw new AxiosError('timeout', 'ECONNABORTED', config)
  }
  await expect(api.get('/billing/recharges/request', { silentError: true })).rejects.toThrow('timeout')
  expect(ElMessage.error).not.toHaveBeenCalled()
  await expect(api.get('/machines')).rejects.toThrow('timeout')
  expect(ElMessage.error).toHaveBeenCalledOnce()
})

it.each([false, true])('401只清除发起请求的会话；期间切换账号=%s', async switched => {
  localStorage.setItem('token', 'old-token')
  client.defaults.adapter = async config => {
    if (switched) localStorage.setItem('token', 'new-token')
    throw new AxiosError('expired', 'ERR_BAD_REQUEST', config, undefined,
      { status: 401, statusText: 'Unauthorized', headers: {}, data: { message: 'expired' }, config })
  }
  await expect(api.get('/auth/profile')).rejects.toThrow('expired')
  expect(localStorage.getItem('token')).toBe(switched ? 'new-token' : null)
  expect(window.location.href).toBe(switched ? 'http://localhost/' : '/login')
})
