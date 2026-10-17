import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SeatHall from './SeatHall.vue'
const areas = [{ id: 1, name: '竞技区', pricePerHour: 15 }]
const machines = [{ id: 'A-01', areaId: 1, status: 'offline', positionX: 0, positionY: 0 }, { id: 'A-02', areaId: 1, status: 'fault', positionX: 1, positionY: 0 }]
describe('SeatHall', () => {
  it('shows live capacity and emits selection only for available seats', async () => {
    const wrapper = mount(SeatHall, { props: { areas, machines } })
    expect(wrapper.text()).toContain('余 1 席')
    expect(wrapper.text()).toContain('¥15.00/时')
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    await buttons[1].trigger('click')
    expect(wrapper.emitted('select')).toEqual([[machines[0]]])
    expect(buttons[1].attributes('disabled')).toBeDefined()
  })
  it('updates seat availability when live data changes', async () => {
    const wrapper = mount(SeatHall, { props: { areas, machines } })
    await wrapper.setProps({ machines: machines.map(machine => ({ ...machine, status: 'online' })) })
    expect(wrapper.text()).toContain('余 0 席')
    expect(wrapper.findAll('button').every(button => button.attributes('disabled') !== undefined)).toBe(true)
  })
  it('disables selection during submission and identifies schematic placement', () => {
    const wrapper = mount(SeatHall, { props: { areas, machines: [{ id: 'A-01', areaId: 1, status: 'offline' }], busy: true } })
    expect(wrapper.text()).toContain('座位位置待门店确认')
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
  })
})
