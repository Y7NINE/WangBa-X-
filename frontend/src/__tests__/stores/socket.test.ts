import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { io, type Socket } from 'socket.io-client'
import { useSocketStore } from '@/stores/socket'
import { useAuthStore } from '@/stores/auth'
import { useMachineStore } from '@/stores/machine'
import { flushPromises } from '@vue/test-utils'

vi.mock('socket.io-client', () => ({ io: vi.fn() }))
const recovery = vi.hoisted(() => ({ fetchAreas: vi.fn(), fetchMachines: vi.fn(), fetchTickets: vi.fn(), invalidateMachines: vi.fn(), invalidateFaults: vi.fn() }))
vi.mock('@/stores/machine', () => ({ useMachineStore: () => ({ updateMachineStatus: update, fetchAreas: recovery.fetchAreas,
  fetchMachines: recovery.fetchMachines, invalidateRequests: recovery.invalidateMachines }) }))
vi.mock('@/stores/fault', () => ({ useFaultStore: () => ({ addTicket: vi.fn(), updateTicket: vi.fn(),
  fetchTickets: recovery.fetchTickets, invalidateRequests: recovery.invalidateFaults }) }))
const update = vi.hoisted(() => vi.fn())
function fake() {
  const handlers = new Map<string, (...args: any[]) => void>()
  return { handlers, on: vi.fn((event: string, handler: (...args: any[]) => void) => { handlers.set(event, handler) }),
    timeout: vi.fn().mockReturnThis(),
    emit: vi.fn((_event: string, _data?: unknown, callback?: (error: Error | null, reply: { ok: boolean }) => void) => { callback?.(null, { ok: true }) }),
    disconnect: vi.fn(), removeAllListeners: vi.fn() }
}

describe('管理端Socket身份与连接生命周期', () => {
  let sockets: ReturnType<typeof fake>[]
  beforeEach(() => {
    vi.clearAllMocks()
    recovery.fetchAreas.mockReset().mockResolvedValue(undefined)
    recovery.fetchMachines.mockReset().mockResolvedValue(undefined)
    recovery.fetchTickets.mockReset().mockResolvedValue(undefined)
    localStorage.clear()
    setActivePinia(createPinia())
    sockets = []
    vi.mocked(io).mockImplementation(() => { const socket = fake(); sockets.push(socket); return socket as unknown as Socket })
  })
  afterEach(() => { useSocketStore().disconnect(); useSocketStore().$dispose() })
  function login(role: 'admin' | 'technician' | 'cleaner' = 'admin') {
    localStorage.setItem('token', 'first-token')
    const auth = useAuthStore()
    auth.token = 'first-token'
    auth.user = { id: 1, username: role, name: role, role }
    return auth
  }

  it('无令牌不建立连接', () => { useSocketStore().connect(); expect(io).not.toHaveBeenCalled() })

  it('每次握手读取当前令牌，重复connect先清理旧连接', () => {
    login()
    const store = useSocketStore()
    store.connect()
    const options = vi.mocked(io).mock.calls[0][0] as unknown as { auth: (callback: (data: unknown) => void) => void }
    const callback = vi.fn()
    options.auth(callback)
    expect(callback).toHaveBeenLastCalledWith({ token: 'first-token' })
    localStorage.setItem('token', 'fresh-token')
    options.auth(callback)
    expect(callback).toHaveBeenLastCalledWith({ token: 'fresh-token' })
    store.connect()
    expect(sockets[0].removeAllListeners).toHaveBeenCalledOnce()
    expect(sockets[0].disconnect).toHaveBeenCalledOnce()
  })

  it.each(['technician', 'cleaner'] as const)('%s只请求岗位允许的工单订阅', async role => {
    login(role)
    const store = useSocketStore()
    store.connect()
    sockets[0].handlers.get('connect')!()
    await flushPromises()
    expect(store.connected).toBe(true)
    if (role === 'technician') expect(sockets[0].emit).toHaveBeenCalledWith('subscribe', { topic: 'tickets' }, expect.any(Function))
    else expect(sockets[0].emit).not.toHaveBeenCalled()
    expect(recovery.fetchAreas).toHaveBeenCalledOnce()
    expect(recovery.fetchMachines).toHaveBeenCalledOnce()
    expect(recovery.fetchTickets).toHaveBeenCalledTimes(role === 'technician' ? 1 : 0)
  })

  it('换账号清理旧连接，迟到事件不能覆盖新连接状态或座位', () => {
    const auth = login()
    const store = useSocketStore()
    store.connect()
    const old = sockets[0]
    localStorage.setItem('token', 'next-token')
    auth.token = 'next-token'
    expect(old.disconnect).toHaveBeenCalledOnce()
    expect(sockets).toHaveLength(2)
    sockets[1].handlers.get('connect')!()
    old.handlers.get('disconnect')!()
    old.handlers.get('machine_status_update')!({ machine_id: 'B-01', status: 'offline' })
    expect(store.connected).toBe(true)
    expect(update).not.toHaveBeenCalled()
    sockets[1].handlers.get('machine_status_update')!({ machine_id: 'B-01', status: 'online' })
    expect(useMachineStore().updateMachineStatus).toHaveBeenCalledWith('B-01', 'online')
  })

  it('退出立即断开，连接失败正确显示离线', () => {
    const auth = login()
    const store = useSocketStore()
    store.connect()
    sockets[0].handlers.get('connect')!()
    sockets[0].handlers.get('connect_error')!()
    expect(store.connected).toBe(false)
    localStorage.removeItem('token')
    auth.token = ''
    expect(store.socket).toBeNull()
    expect(sockets).toHaveLength(1)
    expect(sockets[0].disconnect).toHaveBeenCalledOnce()
  })

  it('真实clearSession先清store再清存储时不会重连旧账号', () => {
    const auth = login()
    const store = useSocketStore()
    store.connect()
    auth.clearSession()
    expect(store.socket).toBeNull()
    expect(sockets).toHaveLength(1)
    expect(sockets[0].disconnect).toHaveBeenCalledOnce()
  })

  it('同一Socket重连后重新获取列表，刷新失败保留可重试状态', async () => {
    login()
    const store = useSocketStore()
    store.connect()
    sockets[0].handlers.get('connect')!()
    await flushPromises()
    expect(store.recovering).toBe(false)
    sockets[0].handlers.get('disconnect')!()
    recovery.fetchTickets.mockRejectedValueOnce(new Error('offline'))
    sockets[0].handlers.get('connect')!()
    await flushPromises()
    expect(recovery.fetchMachines).toHaveBeenCalledTimes(2)
    expect(store.recoveryError).toContain('部分数据未更新')
    await store.recover()
    expect(recovery.fetchTickets).toHaveBeenCalledTimes(3)
    expect(store.recoveryError).toBe('')
  })

  it('断开后的旧同步失败不能污染新连接的完成状态', async () => {
    login()
    let reject!: (reason: Error) => void
    recovery.fetchMachines.mockImplementationOnce(() => new Promise<void>((_resolve, fail) => { reject = fail }))
    const store = useSocketStore()
    store.connect()
    sockets[0].handlers.get('connect')!()
    expect(store.recovering).toBe(true)
    await flushPromises()
    sockets[0].handlers.get('disconnect')!()
    sockets[0].handlers.get('connect')!()
    await flushPromises()
    reject(new Error('old request failed'))
    await flushPromises()
    expect(store.recovering).toBe(false)
    expect(store.recoveryError).toBe('')
    expect(store.connected).toBe(true)
  })

  it('订阅确认前不取快照，确认后才加载；失败后可重试', async () => {
    login()
    const store = useSocketStore()
    store.connect()
    let confirm!: (error: Error | null, reply: { ok: boolean }) => void
    sockets[0].emit.mockImplementationOnce((_event, _data, callback) => { confirm = callback! })
    sockets[0].handlers.get('connect')!()
    await flushPromises()
    expect(recovery.fetchTickets).not.toHaveBeenCalled()
    expect(store.recovering).toBe(true)
    confirm(null, { ok: false })
    await flushPromises()
    expect(store.recoveryError).toContain('订阅未确认')
    expect(recovery.fetchTickets).not.toHaveBeenCalled()
    await store.recover()
    expect(recovery.fetchTickets).toHaveBeenCalledOnce()
    expect(store.recoveryError).toBe('')
  })

  it('同步中只有浏览器令牌变化时不显示同步成功或一直等待', async () => {
    login()
    let done!: () => void
    recovery.fetchMachines.mockImplementationOnce(() => new Promise<void>(resolve => { done = resolve }))
    const store = useSocketStore()
    store.connect()
    sockets[0].handlers.get('connect')!()
    await flushPromises()
    localStorage.setItem('token', 'other-tab-token')
    done()
    await flushPromises()
    expect(store.recovering).toBe(false)
    expect(store.recoveryError).toContain('登录状态已变化')
  })
})
