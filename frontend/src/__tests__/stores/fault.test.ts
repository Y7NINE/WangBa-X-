import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useFaultStore } from '@/stores/fault'

// Mock faultApi
vi.mock('@/api/fault', () => ({
  faultApi: {
    getTickets: vi.fn().mockResolvedValue([
      { id: 'T001', machineId: 'A-01', faultType: 'mouse', priority: 'P2', status: 'pending' },
      { id: 'T002', machineId: 'A-02', faultType: 'keyboard', priority: 'P1', status: 'accepted' },
      { id: 'T003', machineId: 'B-01', faultType: 'network', priority: 'P3', status: 'resolved' },
    ]),
  },
}))

describe('Fault Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('应该初始化为空状态', () => {
    const store = useFaultStore()
    expect(store.tickets).toEqual([])
  })

  it('应该获取工单列表', async () => {
    const store = useFaultStore()
    await store.fetchTickets()
    
    expect(store.tickets).toHaveLength(3)
  })

  it('应该正确筛选待处理工单', async () => {
    const store = useFaultStore()
    await store.fetchTickets()
    
    expect(store.pendingTickets).toHaveLength(1)
    expect(store.pendingTickets[0].status).toBe('pending')
  })

  it('应该正确筛选处理中工单', async () => {
    const store = useFaultStore()
    await store.fetchTickets()
    
    expect(store.processingTickets).toHaveLength(1)
    expect(store.processingTickets[0].status).toBe('accepted')
  })

  it('应该按优先级排序', async () => {
    const store = useFaultStore()
    await store.fetchTickets()
    
    const sorted = store.sortedTickets
    expect(sorted[0].priority).toBe('P1')
    expect(sorted[1].priority).toBe('P2')
    expect(sorted[2].priority).toBe('P3')
  })

  it('应该添加新工单', async () => {
    const store = useFaultStore()
    await store.fetchTickets()
    
    store.addTicket({
      id: 'T004',
      machineId: 'C-01',
      faultType: 'monitor',
      priority: 'P0',
      status: 'pending',
    } as any)
    
    expect(store.tickets).toHaveLength(4)
  })

  it('应该更新工单', async () => {
    const store = useFaultStore()
    await store.fetchTickets()
    
    store.updateTicket('T001', { status: 'accepted' })
    
    const ticket = store.tickets.find(t => t.id === 'T001')
    expect(ticket?.status).toBe('accepted')
  })

  it('应该删除工单', async () => {
    const store = useFaultStore()
    await store.fetchTickets()
    const initialLength = store.tickets.length
    
    store.removeTicket('T001')
    
    expect(store.tickets).toHaveLength(initialLength - 1)
    expect(store.tickets.find(t => t.id === 'T001')).toBeUndefined()
  })
})
