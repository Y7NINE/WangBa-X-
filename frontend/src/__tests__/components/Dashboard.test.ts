import { beforeEach } from 'vitest'
import { describe, it, expect, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ElementPlus from 'element-plus'
import { analyticsApi } from '@/api/analytics'
import Dashboard from '@/views/dashboard/index.vue'

vi.mock('@/api/analytics', () => ({ analyticsApi: { getOverview: vi.fn().mockResolvedValue({ revenue: 0, sessions: 0, revenueByDay: [] }) } }))

// Mock stores
vi.mock('@/stores/machine', () => ({
  useMachineStore: () => ({
    machines: [],
    areas: [],
    stats: { total: 10, online: 5, offline: 3, fault: 2, dirty: 0, cleaning: 0 },
    fetchMachines: vi.fn(),
    fetchAreas: vi.fn(),
  }),
}))

vi.mock('@/stores/fault', () => ({
  useFaultStore: () => ({
    tickets: [],
    pendingTickets: [],
    fetchTickets: vi.fn(),
  }),
}))

// Mock echarts
vi.mock('vue-echarts', () => ({
  default: {
    name: 'VChart',
    template: '<div class="mock-chart"></div>',
  },
}))

describe('Dashboard Component', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('应该渲染仪表盘页面', () => {
    const wrapper = mount(Dashboard, {
      global: {
        plugins: [ElementPlus],
        stubs: {
          VChart: true,
        },
      },
    })

    expect(wrapper.find('.dashboard-container').exists()).toBe(true)
  })

  it('应该显示统计卡片', () => {
    const wrapper = mount(Dashboard, {
      global: {
        plugins: [ElementPlus],
        stubs: {
          VChart: true,
        },
      },
    })

    const statCards = wrapper.findAll('.stat-card')
    expect(statCards.length).toBe(4)
  })

  it('应该显示图表区域', () => {
    const wrapper = mount(Dashboard, {
      global: {
        plugins: [ElementPlus],
        stubs: {
          VChart: true,
        },
      },
    })

    expect(wrapper.find('.chart-row').exists()).toBe(true)
  })

  it('应该显示告警面板', () => {
    const wrapper = mount(Dashboard, {
      global: {
        plugins: [ElementPlus],
        stubs: {
          VChart: true,
        },
      },
    })

    expect(wrapper.find('.alert-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('实时告警')
  })

  it('应该显示区域上座率', () => {
    const wrapper = mount(Dashboard, {
      global: {
        plugins: [ElementPlus],
        stubs: {
          VChart: true,
        },
      },
    })

    expect(wrapper.find('.area-panel').exists()).toBe(true)
    expect(wrapper.text()).toContain('区域上座率')
  })
  it('shows server revenue and session counts without invented growth percentages', async () => {
    vi.mocked(analyticsApi.getOverview).mockResolvedValue({ revenue: 123.45, sessions: 4, hours: 2, occupancyRate: 50, faultCount: 0, activeUsers: 3, revenueByDay: [{ date: '2026-10-17', revenue: 123.45, sessions: 4 }] })
    const wrapper = mount(Dashboard, { global: { plugins: [ElementPlus], stubs: { VChart: true } } })
    await flushPromises()
    expect(wrapper.findAll('.stat-card')[1].text()).toContain('123.45')
    expect(wrapper.findAll('.stat-card')[2].text()).toContain('4')
    expect(wrapper.find('.stat-trend').exists()).toBe(false)
  })

})
