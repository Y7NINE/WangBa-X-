import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { io } from 'socket.io-client'
import { connectCustomerSocket } from './realtime'

vi.mock('socket.io-client', () => ({ io: vi.fn() }))
beforeEach(() => { vi.clearAllMocks(); localStorage.clear() })

describe('顾客端Socket握手', () => {
  it('游客使用HTTP页面，不发起匿名连接', () => {
    expect(connectCustomerSocket(vi.fn(), vi.fn())).toBeNull()
    expect(io).not.toHaveBeenCalled()
  })
  it('重连握手读取最新顾客令牌，并保留座位更新与连接刷新监听', () => {
    const on = vi.fn()
    ;(io as unknown as Mock).mockReturnValue({ on })
    localStorage.setItem('customer_token', 'old')
    const refresh = vi.fn()
    const update = vi.fn()
    connectCustomerSocket(refresh, update)
    const options = (io as unknown as Mock).mock.calls[0][0]
    const callback = vi.fn()
    options.auth(callback)
    expect(callback).toHaveBeenLastCalledWith({ token: 'old' })
    localStorage.setItem('customer_token', 'new')
    options.auth(callback)
    expect(callback).toHaveBeenLastCalledWith({ token: 'new' })
    expect(on).toHaveBeenCalledWith('connect', refresh)
    expect(on).toHaveBeenCalledWith('machine_status_update', update)
  })
  it('以store身份为准，清store时即使存储尚未清理也不建旧连接', () => {
    localStorage.setItem('customer_token', 'stale')
    expect(connectCustomerSocket(vi.fn(), vi.fn(), () => '')).toBeNull()
    expect(io).not.toHaveBeenCalled()
  })
})
