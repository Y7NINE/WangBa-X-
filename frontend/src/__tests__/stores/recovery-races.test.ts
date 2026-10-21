import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useAuthStore } from '@/stores/auth'
import { useMachineStore } from '@/stores/machine'
import { useFaultStore } from '@/stores/fault'
import { machineApi, type Area, type Machine } from '@/api/machine'
import { faultApi, type FaultTicket } from '@/api/fault'

vi.mock('@/api/machine', () => ({ machineApi: { getMachines: vi.fn(), getAreas: vi.fn() } }))
vi.mock('@/api/fault', () => ({ faultApi: { getTickets: vi.fn() } }))
function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: Error) => void
  const promise = new Promise<T>((done, fail) => { resolve = done; reject = fail })
  return { promise, resolve, reject }
}
const seat = (id = 'B-01', status = 'offline'): Machine => ({ id, status, areaId: 1 })
const area: Area = { id: 1, name: '测试区', pricePerHour: 10, status: 'active' }
const ticket = (id = 'T-1', status = 'pending'): FaultTicket => ({
  id, status, machineId: 'B-01', faultType: 'mouse', faultCategory: 'peripheral', source: 'player_report', priority: 'P2', createdAt: '',
})
beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  setActivePinia(createPinia())
  const auth = useAuthStore()
  auth.token = 'first-token'
  localStorage.setItem('token', 'first-token')
  auth.user = { id: 1, role: 'admin', username: 'admin', name: '管理员' }
  vi.mocked(machineApi.getMachines).mockReset().mockResolvedValue([seat()])
  vi.mocked(machineApi.getAreas).mockReset().mockResolvedValue([area])
  vi.mocked(faultApi.getTickets).mockReset().mockResolvedValue([ticket()])
})

describe('重连列表与实时事件竞态', () => {
  it('同类列表请求在途去重，初次加载和重连不重复发HTTP', async () => {
    const seats = deferred<Machine[]>()
    const faults = deferred<FaultTicket[]>()
    const areas = deferred<Area[]>()
    vi.mocked(machineApi.getMachines).mockReturnValueOnce(seats.promise)
    vi.mocked(machineApi.getAreas).mockReturnValueOnce(areas.promise)
    vi.mocked(faultApi.getTickets).mockReturnValueOnce(faults.promise)
    const machine = useMachineStore(); const fault = useFaultStore()
    const requests = [machine.fetchMachines(), machine.fetchMachines(), machine.fetchAreas(), machine.fetchAreas(), fault.fetchTickets(), fault.fetchTickets()]
    expect(machineApi.getMachines).toHaveBeenCalledOnce()
    expect(machineApi.getAreas).toHaveBeenCalledOnce()
    expect(faultApi.getTickets).toHaveBeenCalledOnce()
    seats.resolve([seat()]); areas.resolve([area]); faults.resolve([ticket()])
    await Promise.all(requests)
    expect(machine.loading).toBe(false)
    expect(fault.loading).toBe(false)
  })

  it.each([true, false])('不同筛选请求乱序返回，旧响应先返回=%s，只有最新筛选生效', async oldFirst => {
    const first = deferred<Machine[]>(); const last = deferred<Machine[]>()
    vi.mocked(machineApi.getMachines).mockReturnValueOnce(first.promise).mockReturnValueOnce(last.promise)
    const store = useMachineStore()
    const previous = store.fetchMachines(1); const current = store.fetchMachines(2)
    if (oldFirst) {
      first.resolve([seat('old')]); await previous
      expect(store.loading).toBe(true)
      last.resolve([seat('new')]); await current
    } else {
      last.resolve([seat('new')]); await current
      first.resolve([seat('old')]); await previous
    }
    expect(store.machines.map(row => row.id)).toEqual(['new'])
    expect(store.loading).toBe(false)
  })

  it('退出清空数据，迟到的座位、区域和工单结果不能恢复旧账号', async () => {
    const seats = deferred<Machine[]>(); const faults = deferred<FaultTicket[]>(); const areas = deferred<Area[]>()
    vi.mocked(machineApi.getMachines).mockReturnValueOnce(seats.promise)
    vi.mocked(machineApi.getAreas).mockReturnValueOnce(areas.promise)
    vi.mocked(faultApi.getTickets).mockReturnValueOnce(faults.promise)
    const machine = useMachineStore(); const fault = useFaultStore()
    machine.machines = [seat()]; machine.areas = [area]; fault.tickets = [ticket()]
    const requests = [machine.fetchMachines(), machine.fetchAreas(), fault.fetchTickets()]
    useAuthStore().clearSession()
    expect(machine.machines).toEqual([]); expect(fault.tickets).toEqual([])
    seats.resolve([seat('private')]); areas.resolve([area]); faults.resolve([ticket('private')])
    await Promise.all(requests)
    expect(machine.machines).toEqual([]); expect(machine.areas).toEqual([]); expect(fault.tickets).toEqual([])
  })

  it('换为保洁身份后不接受旧工单结果', async () => {
    const pending = deferred<FaultTicket[]>()
    vi.mocked(faultApi.getTickets).mockReturnValueOnce(pending.promise)
    const fault = useFaultStore()
    const request = fault.fetchTickets()
    useAuthStore().user = { id: 5, role: 'cleaner', username: 'cleaner', name: '保洁' }
    pending.resolve([ticket('private')]); await request
    expect(fault.tickets).toEqual([])
    expect(fault.loading).toBe(false)
  })

  it('同身份资料刷新不丢弃在途数据', async () => {
    const pending = deferred<Machine[]>()
    vi.mocked(machineApi.getMachines).mockReturnValueOnce(pending.promise)
    const machine = useMachineStore(); const request = machine.fetchMachines()
    const auth = useAuthStore(); auth.user = { ...auth.user!, name: '新名称' }
    expect(machine.loading).toBe(true)
    pending.resolve([seat()]); await request
    expect(machine.machines).toHaveLength(1)
  })

  it('列表加载期间的座位推送覆盖旧快照，包含新出现的机器', async () => {
    const pending = deferred<Machine[]>()
    vi.mocked(machineApi.getMachines).mockReturnValueOnce(pending.promise)
    const machine = useMachineStore(); const request = machine.fetchMachines()
    machine.updateMachineStatus('B-01', 'online')
    machine.updateMachineStatus('B-01', 'dirty')
    machine.updateMachineStatus('new', 'fault')
    pending.resolve([seat(), seat('new')]); await request
    expect(machine.machines.map(row => row.status)).toEqual(['dirty', 'fault'])
  })

  it('工单快照合并期间的新增、更新、删除，重复告警不会重复插入', async () => {
    const pending = deferred<FaultTicket[]>()
    vi.mocked(faultApi.getTickets).mockReturnValueOnce(pending.promise)
    const fault = useFaultStore(); const request = fault.fetchTickets()
    fault.addTicket(ticket('new')); fault.addTicket(ticket('new', 'accepted'))
    fault.updateTicket('T-1', { status: 'resolved' }); fault.removeTicket('removed')
    pending.resolve([ticket(), ticket('removed')]); await request
    expect(fault.tickets.map(row => [row.id, row.status])).toEqual([['new', 'accepted'], ['T-1', 'resolved']])
    fault.addTicket(ticket('new', 'processing'))
    expect(fault.tickets.filter(row => row.id === 'new')).toHaveLength(1)
  })

  it('断线使旧请求失效，保留已有快照，新同步可以完成', async () => {
    const stale = deferred<FaultTicket[]>()
    vi.mocked(faultApi.getTickets).mockReturnValueOnce(stale.promise)
    const fault = useFaultStore(); fault.tickets = [ticket('known')]
    const previous = fault.fetchTickets()
    fault.invalidateRequests()
    const current = fault.fetchTickets()
    await current
    stale.resolve([ticket('stale')]); await previous
    expect(fault.tickets.map(row => row.id)).toEqual(['T-1'])
  })

  it('刷新失败保留已有列表并允许重试', async () => {
    const fault = useFaultStore(); fault.tickets = [ticket('known')]
    vi.mocked(faultApi.getTickets).mockRejectedValueOnce(new Error('network'))
    await expect(fault.fetchTickets()).rejects.toThrow('network')
    expect(fault.tickets[0].id).toBe('known'); expect(fault.loading).toBe(false)
    await fault.fetchTickets()
    expect(fault.tickets[0].id).toBe('T-1')
  })

  it('仅浏览器存储令牌改变也不能接收旧列表或用新身份发送旧界面查询', async () => {
    const pending = deferred<FaultTicket[]>()
    vi.mocked(faultApi.getTickets).mockReturnValueOnce(pending.promise)
    const fault = useFaultStore(); const request = fault.fetchTickets()
    localStorage.setItem('token', 'another-account')
    pending.resolve([ticket('private')]); await request
    expect(fault.tickets).toEqual([])
    await expect(fault.fetchTickets()).rejects.toThrow('登录状态已变化')
    await expect(useMachineStore().fetchMachines()).rejects.toThrow('登录状态已变化')
    expect(faultApi.getTickets).toHaveBeenCalledOnce()
    expect(machineApi.getMachines).not.toHaveBeenCalled()
  })
})
