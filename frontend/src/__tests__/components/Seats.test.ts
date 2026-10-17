import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'
import Seats from '@/views/seats/index.vue'

// Mock machine store
vi.mock('@/stores/machine', () => ({
  useMachineStore: () => ({
    machines: [
      { id: 'A-01', areaId: 1, status: 'offline' },
      { id: 'A-02', areaId: 1, status: 'online' },
      { id: 'B-01', areaId: 2, status: 'fault' },
    ],
    areas: [
      { id: 1, name: '竞技区' },
      { id: 2, name: '休闲区' },
    ],
    stats: { total: 3, online: 1, offline: 1, fault: 1, dirty: 0, cleaning: 0 },
    fetchMachines: vi.fn(),
    fetchAreas: vi.fn(),
    updateMachineStatus: vi.fn(),
  }),
}))

// Mock fault store
vi.mock('@/stores/fault', () => ({
  useFaultStore: () => ({
    tickets: [],
    fetchTickets: vi.fn(),
  }),
}))

// Mock API modules
vi.mock('@/api/machine', () => ({
  machineApi: {
    getMachines: vi.fn(),
    getAreas: vi.fn(),
    updateStatus: vi.fn(),
  },
}))

vi.mock('@/api/fault', () => ({
  faultApi: {
    createTicket: vi.fn(),
  },
}))

describe('Seats Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('应该渲染座位管理页面', () => {
    const wrapper = mount(Seats, {
      global: {
        plugins: [ElementPlus],
        stubs: {
          ElIcon: true,
          Grid: true,
          Menu: true,
          Monitor: true,
          Coffee: true,
          Male: true,
        },
      },
    })

    expect(wrapper.find('.seats-container').exists()).toBe(true)
    expect(wrapper.find('.stats-bar').exists()).toBe(true)
  })

  it('应该显示统计数据', () => {
    const wrapper = mount(Seats, {
      global: {
        plugins: [ElementPlus],
        stubs: {
          ElIcon: true,
          Grid: true,
          Menu: true,
          Monitor: true,
          Coffee: true,
          Male: true,
        },
      },
    })

    const statValues = wrapper.findAll('.stat-value')
    expect(statValues.length).toBe(6)
  })

  it('应该显示区域筛选', () => {
    const wrapper = mount(Seats, {
      global: {
        plugins: [ElementPlus],
        stubs: {
          ElIcon: true,
          Grid: true,
          Menu: true,
          Monitor: true,
          Coffee: true,
          Male: true,
        },
      },
    })

    expect(wrapper.find('.filter-bar').exists()).toBe(true)
  })

  it('应该显示视图切换按钮', () => {
    const wrapper = mount(Seats, {
      global: {
        plugins: [ElementPlus],
        stubs: {
          ElIcon: true,
          Grid: true,
          Menu: true,
          Monitor: true,
          Coffee: true,
          Male: true,
        },
      },
    })

    expect(wrapper.text()).toContain('平面图')
    expect(wrapper.text()).toContain('列表')
  })

  it('应该能够切换视图模式', async () => {
    const wrapper = mount(Seats, {
      global: {
        plugins: [ElementPlus],
        stubs: {
          ElIcon: true,
          Grid: true,
          Menu: true,
          Monitor: true,
          Coffee: true,
          Male: true,
        },
      },
    })

    // 默认是平面图模式
    expect(wrapper.find('.floor-plan-container').exists()).toBe(true)

    // 切换到列表模式
    const listButton = wrapper.findAll('.el-radio-button').find(b => b.text().includes('列表'))
    expect(listButton).toBeDefined()
    await listButton!.get('input[type="radio"]').setValue()

    await wrapper.vm.$nextTick()
    expect(wrapper.find('.grid-view-container').exists()).toBe(true)
  })

  it('应该显示平面图元素', () => {
    const wrapper = mount(Seats, {
      global: {
        plugins: [ElementPlus],
        stubs: {
          ElIcon: true,
          Grid: true,
          Menu: true,
          Monitor: true,
          Coffee: true,
          Male: true,
        },
      },
    })

    expect(wrapper.find('.floor-plan').exists()).toBe(true)
    expect(wrapper.find('.entrance').exists()).toBe(true)
    expect(wrapper.find('.counter').exists()).toBe(true)
    expect(wrapper.text()).toContain('收银台')
  })
})
