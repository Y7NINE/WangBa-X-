import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus, { ElForm, ElInput, ElMessage, ElMessageBox } from 'element-plus'
import Billing from '@/views/billing/index.vue'
import Users from '@/views/users/index.vue'
import { billingApi } from '@/api/billing'
import { userApi } from '@/api/user'

const requestId = 'a03f9fd2-24e9-4ba7-883c-a3760f9c8b15'
const key = 'wangba:pending-recharge:3'
vi.mock('@/stores/auth', () => ({ useAuthStore: () => ({ user: { id: 3 } }) }))
vi.mock('@/api/billing', () => ({ billingApi: {
  getActiveSessions: vi.fn().mockResolvedValue([]), getTransactions: vi.fn().mockResolvedValue([]),
  recharge: vi.fn(), getRechargeResult: vi.fn(),
  endSession: vi.fn(), resumeSession: vi.fn(), pauseSession: vi.fn(),
} }))
vi.mock('@/api/user', () => ({ userApi: { getUsers: vi.fn() } }))
const options = { global: { plugins: [ElementPlus], stubs: {
  ElDialog: { template: '<section><slot /><slot name="footer" /></section>' }, ElIcon: true,
} } }
const click = async (wrapper: ReturnType<typeof mount>, label: string) => {
  const button = wrapper.findAll('button').find(item => item.text() === label)
  expect(button, label).toBeTruthy()
  await button!.trigger('click')
  await flushPromises()
}

describe('两个充值入口接入可恢复请求', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    vi.stubGlobal('crypto', { randomUUID: () => requestId })
    vi.mocked(billingApi.getActiveSessions).mockResolvedValue([])
    vi.mocked(billingApi.getTransactions).mockResolvedValue([])
    vi.mocked(billingApi.recharge).mockImplementation(async command => ({
      ...command, id: 1, type: 'recharge', operatorId: 3, balanceAfter: 42.34, createdAt: '2026-10-21',
    }))
    vi.mocked(userApi.getUsers).mockResolvedValue([{
      id: 7, nickname: '测试会员', balance: 30, bonusBalance: 0, credits: 0, memberLevel: 'normal',
      totalSpent: 0, totalHours: 0, isActive: true, createdAt: '', updatedAt: '',
    }])
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('计费入口恢复原参数并禁用编辑，确认返回流水后刷新列表', async () => {
    sessionStorage.setItem(key, JSON.stringify({ requestId, userId: 7, amount: 12.34, paymentMethod: 'cash' }))
    const wrapper = mount(Billing, options)
    await flushPromises()
    await click(wrapper, '充值')
    expect(wrapper.findComponent(ElInput).props('modelValue')).toBe('7')
    expect(wrapper.findComponent(ElForm).props('disabled')).toBe(true)
    await click(wrapper, '确认结果 / 重试原充值')
    expect(billingApi.recharge).toHaveBeenCalledWith({ requestId, userId: 7, amount: 12.34, paymentMethod: 'cash' })
    expect(sessionStorage.getItem(key)).toBeNull()
    expect(billingApi.getTransactions).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })

  it('计费入口不把含字母的会员ID截断成合法ID', async () => {
    const wrapper = mount(Billing, options)
    await flushPromises()
    await click(wrapper, '充值')
    await wrapper.findComponent(ElInput).setValue('7abc')
    await click(wrapper, '确认充值')
    expect(billingApi.recharge).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('会员入口恢复原请求，超时确认成功后使用服务端余额', async () => {
    const command = { requestId, userId: 7, amount: 12.34, paymentMethod: 'cash' }
    sessionStorage.setItem(key, JSON.stringify(command))
    vi.mocked(billingApi.recharge).mockRejectedValueOnce(new Error('timeout'))
    vi.mocked(billingApi.getRechargeResult).mockResolvedValueOnce({
      ...command, id: 1, type: 'recharge', operatorId: 3, balanceAfter: 42.34, createdAt: '2026-10-21',
    })
    const success = vi.spyOn(ElMessage, 'success')
    const wrapper = mount(Users, options)
    await flushPromises()
    await click(wrapper, '充值')
    expect(wrapper.findComponent(ElForm).props('disabled')).toBe(true)
    await click(wrapper, '确认结果 / 重试原充值')
    expect(billingApi.getRechargeResult).toHaveBeenCalledWith(requestId)
    expect(success).toHaveBeenCalledWith('充值已确认！会员 测试会员，金额 ¥12.34')
    expect(sessionStorage.getItem(key)).toBeNull()
    expect(wrapper.text()).toContain('42.34')
    wrapper.unmount()
  })

  it('待结算会话显示固定状态并隐藏恢复，欠费重试后刷新状态', async () => {
    vi.mocked(billingApi.getActiveSessions).mockResolvedValue([{
      id: 9, userId: 7, machineId: 'B-01', startTime: '', duration: 2, amount: 2, status: 'paused',
      settlementRequestedAt: '2026-10-21T01:05:00.000Z',
    }])
    vi.mocked(billingApi.endSession).mockRejectedValueOnce({ response: { status: 409, data: { message: '已停止计费，请补款' } } })
    // Installed Element Plus types intersect the action string with an input object.
    vi.spyOn(ElMessageBox, 'confirm').mockResolvedValue('confirm' as Awaited<ReturnType<typeof ElMessageBox.confirm>>)
    const error = vi.spyOn(ElMessage, 'error')
    const wrapper = mount(Billing, options)
    await flushPromises()
    expect(wrapper.text()).toContain('待结算（已停计费）')
    expect(wrapper.findAll('button').some(button => button.text() === '恢复')).toBe(false)
    await click(wrapper, '重试结算')
    expect(billingApi.endSession).toHaveBeenCalledWith(9)
    expect(error).toHaveBeenCalledWith('已停止计费，请补款')
    expect(billingApi.getActiveSessions).toHaveBeenCalledTimes(2)
    wrapper.unmount()
  })
})
