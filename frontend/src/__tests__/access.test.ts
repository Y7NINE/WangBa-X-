import { describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { canAcceptFault, canCompleteCleaning, canResolveFault, canTransferFault, canStartCleaning, homeForRole, menuForRole, type StaffIdentity } from '@/access'
import { createAccessGuard } from '@/router/access-guard'

describe('员工权限与导航', () => {
  it.each([
    ['admin', ['/dashboard', '/seats', '/faults', '/billing', '/users', '/cleaning', '/orders', '/reports', '/settings']],
    ['manager', ['/dashboard', '/seats', '/faults', '/billing', '/users', '/cleaning', '/orders', '/reports', '/settings']],
    ['cashier', ['/dashboard', '/seats', '/faults', '/billing', '/users', '/cleaning', '/orders', '/reports']],
    ['technician', ['/seats', '/faults']], ['cleaner', ['/seats', '/cleaning']],
    ['customer', []], ['owner', []], [undefined, []],
  ])('%s 仅看到岗位允许的导航', (role, expected) => {
    expect(menuForRole(role).map(item => item.path)).toEqual(expected)
  })

  it.each([
    ['admin', true, true, true, true], ['manager', true, true, true, true],
    ['cashier', false, false, true, false], ['technician', true, true, true, false],
    ['cleaner', false, false, false, true], ['customer', false, false, false, false],
  ])('%s 的任务按钮遵守岗位和任务归属', (role, accept, resolve, transfer, clean) => {
    const user = { id: 4, role: String(role) }
    expect(canAcceptFault(user, { status: 'pending' })).toBe(accept)
    expect(canResolveFault(user, { status: 'accepted', handlerId: 4 })).toBe(resolve)
    expect(canTransferFault(user, { status: 'accepted', handlerId: 4 })).toBe(transfer)
    expect(canStartCleaning(user)).toBe(clean)
  })

  it('技师和保洁看不到其他员工任务的完成按钮', () => {
    expect(canResolveFault({ id: 4, role: 'technician' }, { status: 'accepted', handlerId: 6 })).toBe(false)
    expect(canTransferFault({ id: 4, role: 'technician' }, { status: 'accepted', handlerId: 6 })).toBe(false)
    expect(canCompleteCleaning({ id: 5, role: 'cleaner' }, { status: 'in_progress', cleanerId: 6 })).toBe(false)
    expect(canCompleteCleaning({ id: 5, role: 'cleaner' }, { status: 'in_progress', cleanerId: 5 })).toBe(true)
    expect(canCompleteCleaning({ id: 1, role: 'admin' }, { status: 'completed', cleanerId: 5 })).toBe(false)
  })

  it.each(['admin', 'manager', 'cashier', 'technician', 'cleaner'])('刷新后按服务端 %s 身份处理深链', async role => {
    const session = {
      token: 'persisted-token', user: null as StaffIdentity | null,
      getProfile: vi.fn(async () => { session.user = { id: 1, role } }), clearSession: vi.fn(),
    }
    const router = createRouter({ history: createMemoryHistory(), routes: [
      ...['/login', '/dashboard', '/billing', '/faults', '/cleaning', '/seats'].map(path => ({ path, component: { template: '<div />' } })),
    ] })
    router.beforeEach(createAccessGuard(session))
    await router.push('/billing')
    expect(router.currentRoute.value.path).toBe(['technician', 'cleaner'].includes(role) ? homeForRole(role) : '/billing')
    expect(session.getProfile).toHaveBeenCalledTimes(1)
    await router.push('/seats')
    expect(session.getProfile).toHaveBeenCalledTimes(1)
  })

  it('没有令牌时不读取身份，未知角色拒绝进入', async () => {
    const session = { token: '', user: null as StaffIdentity | null, getProfile: vi.fn(), clearSession: vi.fn() }
    expect(await createAccessGuard(session)({ path: '/settings' })).toBe('/login')
    expect(session.getProfile).not.toHaveBeenCalled()
    session.token = 'token'
    session.user = { id: 1, role: 'customer' }
    expect(await createAccessGuard(session)({ path: '/billing' })).toBe('/login')
    expect(session.clearSession).toHaveBeenCalledOnce()
  })

  it('身份查询临时失败不放行，也不由路由清除令牌', async () => {
    const session = { token: 'token', user: null, getProfile: vi.fn().mockRejectedValue(new Error('offline')), clearSession: vi.fn() }
    expect(await createAccessGuard(session)({ path: '/settings' })).toBe('/login')
    expect(session.clearSession).not.toHaveBeenCalled()
  })

  it.each(['/settings', '/shifts', '/bounty', '/wakeup', '/unknown'])('保洁手动访问 %s 返回本岗位入口', async path => {
    const session = { token: 'token', user: { id: 5, role: 'cleaner' }, getProfile: vi.fn(), clearSession: vi.fn() }
    expect(await createAccessGuard(session)({ path })).toBe('/cleaning')
  })
})
