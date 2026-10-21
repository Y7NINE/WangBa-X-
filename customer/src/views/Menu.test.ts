import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ElementPlus, { ElMessage } from 'element-plus'
import Menu from './Menu.vue'
import { useUserStore } from '@/stores/user'
import { orderApi, type Order, type OrderCommand } from '@/api/order'
import api from '@/api'

vi.mock('@/api', () => ({ default: { get: vi.fn().mockResolvedValue([
  { id: 5, name: '可乐', price: 6, description: '罐装饮料' },
]) } }))
vi.mock('@/api/order', () => ({ orderApi: {
  createOrder: vi.fn(), getRequestResult: vi.fn(), getOrders: vi.fn().mockResolvedValue([]),
} }))
vi.mock('@/stores/user', async () => {
  const { reactive } = await import('vue')
  const store = reactive({ user: null, currentSession: null, isLoggedIn: true, refreshProfile: vi.fn() })
  return { useUserStore: () => store }
})
const requestId = 'a03f9fd2-24e9-4ba7-883c-a3760f9c8b15'
const key = 'wangba:pending-order:7'
const pending = { requestId, items: [{ itemId: 5, qty: 1 }], remark: '' }
const receipt = (command: OrderCommand, status = 'pending') => ({
  ...command, id: 9, userId: 7, createdById: 7, createdByType: 'customer', machineId: 'B-01',
  items: JSON.stringify(command.items.map(item => ({ ...item, name: '可乐', price: 6 }))),
  total: 6, status, createdAt: '', updatedAt: '',
})
const options = { global: { plugins: [ElementPlus], stubs: { ElIcon: true, ArrowLeft: true, Coffee: true } } }
const click = async (wrapper: ReturnType<typeof mount>, text: string) => {
  const button = wrapper.findAll('button').find(button => button.text() === text)
  expect(button, text).toBeTruthy()
  await button!.trigger('click')
  await flushPromises()
}

describe('顾客点单页面恢复与确认', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sessionStorage.clear()
    vi.stubGlobal('crypto', { randomUUID: () => requestId })
    const store = useUserStore()
    store.user = { id: 7, nickname: '测试会员', phone: '13800138001', balance: 30, credits: 0, memberLevel: 'normal' }
    store.currentSession = { id: 1, userId: 7, machineId: 'B-01', startTime: '', duration: 0, amount: 0, status: 'active' }
    vi.mocked(store.refreshProfile).mockResolvedValue(undefined)
    vi.mocked(api.get).mockResolvedValue([{ id: 5, name: '可乐', price: 6, description: '罐装饮料' }])
    vi.mocked(orderApi.getOrders).mockResolvedValue([])
    vi.mocked(orderApi.createOrder).mockImplementation(async command => receipt(command))
    vi.mocked(orderApi.getRequestResult).mockRejectedValue({ status: 404 })
  })
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

  it('下单只发送编号和商品数量，资料刷新失败不冒充下单失败', async () => {
    vi.mocked(useUserStore().refreshProfile).mockRejectedValue(new Error('offline'))
    const success = vi.spyOn(ElMessage, 'success')
    const error = vi.spyOn(ElMessage, 'error')
    const warning = vi.spyOn(ElMessage, 'warning')
    const wrapper = mount(Menu, options)
    await flushPromises()
    await wrapper.get('[aria-label="添加可乐"]').trigger('click')
    await click(wrapper, '余额支付下单')
    expect(orderApi.createOrder).toHaveBeenCalledWith(pending)
    expect(success).toHaveBeenCalledWith('订单 #9 已确认，请在下方查看配送进度')
    expect(error).not.toHaveBeenCalled()
    expect(warning).toHaveBeenCalledWith('订单已确认，资料刷新失败，请稍后刷新')
    expect(sessionStorage.getItem(key)).toBeNull()
    wrapper.unmount()
  })

  it('刷新后无上机会话也能确认原取消订单，未知结果时禁止改购物车', async () => {
    sessionStorage.setItem(key, JSON.stringify(pending))
    useUserStore().currentSession = null
    vi.mocked(orderApi.createOrder).mockRejectedValueOnce(new Error('timeout'))
    const wrapper = mount(Menu, options)
    await flushPromises()
    expect(wrapper.get('[aria-label="添加可乐"]').attributes('disabled')).toBeDefined()
    await click(wrapper, '确认原订单')
    expect(sessionStorage.getItem(key)).not.toBeNull()
    vi.mocked(orderApi.getRequestResult).mockResolvedValueOnce(receipt(pending, 'cancelled'))
    vi.mocked(orderApi.createOrder).mockRejectedValueOnce(new Error('timeout'))
    const success = vi.spyOn(ElMessage, 'success')
    await click(wrapper, '确认原订单')
    expect(success).toHaveBeenCalledWith('订单 #9 已取消并退回余额')
    expect(orderApi.createOrder).toHaveBeenCalledTimes(2)
    expect(sessionStorage.getItem(key)).toBeNull()
    wrapper.unmount()
  })

  it('同一会员资料刷新不重建在途请求或生成第二个编号', async () => {
    let done!: (order: Order) => void
    vi.mocked(orderApi.createOrder).mockImplementation(() => new Promise<Order>(resolve => { done = resolve }))
    const wrapper = mount(Menu, options)
    await flushPromises()
    await wrapper.get('[aria-label="添加可乐"]').trigger('click')
    const button = wrapper.findAll('button').find(button => button.text() === '余额支付下单')!
    await button.trigger('click')
    const store = useUserStore()
    store.user = { ...store.user!, balance: 24 }
    await flushPromises()
    expect(wrapper.get('[aria-label="添加可乐"]').attributes('disabled')).toBeDefined()
    await click(wrapper, '确认原订单')
    expect(orderApi.createOrder).toHaveBeenCalledTimes(1)
    done(receipt(pending))
    await flushPromises()
    expect(sessionStorage.getItem(key)).toBeNull()
    wrapper.unmount()
  })

  it('待结算会话禁止新增购物车，原订单仍可确认', async () => {
    useUserStore().currentSession!.settlementRequestedAt = '2026-10-21T01:05:00.000Z'
    sessionStorage.setItem(key, JSON.stringify(pending))
    const wrapper = mount(Menu, options)
    await flushPromises()
    expect(wrapper.text()).toContain('当前会话已停计费，请先补款完成结算')
    expect(wrapper.get('[aria-label="添加可乐"]').attributes('disabled')).toBeDefined()
    await click(wrapper, '确认原订单')
    expect(orderApi.createOrder).toHaveBeenCalledWith(pending)
    expect(sessionStorage.getItem(key)).toBeNull()
    wrapper.unmount()
  })
})
