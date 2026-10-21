import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import ElementPlus from 'element-plus'
import Layout from '@/views/layout/index.vue'

const state = vi.hoisted(() => ({
  auth: { user: { id: 5, name: '员工', role: 'cleaner' }, logout: vi.fn() },
  fault: { tickets: [{ id: 'private-ticket' }], fetchTickets: vi.fn() },
  machine: { fetchAreas: vi.fn(), fetchMachines: vi.fn() },
  socket: { connected: false, recovering: false, recoveryError: '', recover: vi.fn(), connect: vi.fn(), disconnect: vi.fn() },
}))
vi.mock('@/stores/auth', () => ({ useAuthStore: () => state.auth }))
vi.mock('@/stores/fault', () => ({ useFaultStore: () => state.fault }))
vi.mock('@/stores/machine', () => ({ useMachineStore: () => state.machine }))
vi.mock('@/stores/socket', () => ({ useSocketStore: () => state.socket }))
vi.mock('@/api', () => ({ default: { get: vi.fn().mockResolvedValue({ mode: 'demo' }) } }))
vi.mock('vue-router', () => ({ useRoute: () => ({ path: '/seats' }), useRouter: () => ({ push: vi.fn() }) }))

describe('角色布局初始化', () => {
  beforeEach(() => { vi.clearAllMocks(); state.fault.tickets = [{ id: 'private-ticket' }]; state.socket.recovering = false; state.socket.recoveryError = '' })
  it.each([
    ['cleaner', ['/seats', '/cleaning'], false],
    ['technician', ['/seats', '/faults'], true],
    ['cashier', ['/dashboard', '/seats', '/faults', '/billing', '/users', '/cleaning', '/orders', '/reports'], true],
  ])('%s 仅渲染允许菜单并按权限拉取工单', async (role, paths, fetchFaults) => {
    state.auth.user.role = String(role)
    const wrapper = mount(Layout, { global: {
      plugins: [ElementPlus], stubs: {
        ElMenu: { template: '<nav><slot /></nav>' },
        ElMenuItem: { props: ['index'], template: '<a :data-path="index"><slot name="title" /></a>' },
        ElIcon: true, Fold: true, Expand: true, RouterView: true,
      },
    } })
    await flushPromises()
    expect(wrapper.findAll('[data-path]').map(item => item.attributes('data-path'))).toEqual(paths)
    expect(state.fault.fetchTickets).toHaveBeenCalledTimes(fetchFaults ? 1 : 0)
    if (!fetchFaults) expect(state.fault.tickets).toEqual([])
    expect(state.machine.fetchMachines).toHaveBeenCalledOnce()
    wrapper.unmount()
    expect(state.socket.disconnect).toHaveBeenCalledOnce()
  })

  it('连接恢复后部分请求失败时提供实际可用的重新同步入口', async () => {
    state.auth.user.role = 'cleaner'
    state.socket.connected = true
    state.socket.recoveryError = '部分数据未更新，请重新同步'
    const wrapper = mount(Layout, { global: { plugins: [ElementPlus], stubs: {
      ElMenu: true, ElIcon: true, Fold: true, Expand: true, RouterView: true,
    } } })
    await flushPromises()
    const retry = wrapper.findAll('button').find(button => button.text() === '重新同步')
    expect(retry).toBeTruthy()
    await retry!.trigger('click')
    expect(state.socket.recover).toHaveBeenCalledOnce()
    wrapper.unmount()
  })
})
