import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useMachineStore } from '@/stores/machine'

// Mock machineApi
vi.mock('@/api/machine', () => ({
  machineApi: {
    getMachines: vi.fn().mockResolvedValue([
      { id: 'A-01', areaId: 1, status: 'offline' },
      { id: 'A-02', areaId: 1, status: 'online' },
      { id: 'B-01', areaId: 2, status: 'fault' },
    ]),
    getAreas: vi.fn().mockResolvedValue([
      { id: 1, name: '竞技区', pricePerHour: 15 },
      { id: 2, name: '休闲区', pricePerHour: 10 },
    ]),
  },
}))

describe('Machine Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('应该初始化为空状态', () => {
    const store = useMachineStore()
    expect(store.machines).toEqual([])
    expect(store.areas).toEqual([])
  })

  it('应该获取机器列表', async () => {
    const store = useMachineStore()
    await store.fetchMachines()
    
    expect(store.machines).toHaveLength(3)
    expect(store.machines[0].id).toBe('A-01')
  })

  it('应该获取区域列表', async () => {
    const store = useMachineStore()
    await store.fetchAreas()
    
    expect(store.areas).toHaveLength(2)
    expect(store.areas[0].name).toBe('竞技区')
  })

  it('应该正确计算统计数据', async () => {
    const store = useMachineStore()
    await store.fetchMachines()
    
    const stats = store.stats
    expect(stats.total).toBe(3)
    expect(stats.online).toBe(1)
    expect(stats.offline).toBe(1)
    expect(stats.fault).toBe(1)
  })

  it('应该更新机器状态', async () => {
    const store = useMachineStore()
    await store.fetchMachines()
    
    store.updateMachineStatus('A-01', 'online')
    
    const machine = store.machines.find(m => m.id === 'A-01')
    expect(machine?.status).toBe('online')
  })
})
