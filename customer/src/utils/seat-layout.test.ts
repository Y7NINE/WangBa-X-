import { describe, it, expect } from 'vitest'
import { buildSeatLayout } from './seat-layout'
import type { Machine } from '@/api/machine'
const machine = (id: string, positionX?: number, positionY?: number): Machine => ({ id, areaId: 1, status: 'offline', positionX, positionY })
describe('hall seat layout', () => {
  it('uses configured coordinates instead of seat numbers to place seats', () => {
    const layout = buildSeatLayout([machine('A-01', 300, 70), machine('A-02', 100, 20), machine('A-03', 300, 20)])
    expect(layout.configured).toBe(true)
    expect(layout.columns).toBe(2)
    expect(layout.seats.map(seat => [seat.machine.id, seat.column, seat.row])).toEqual([['A-01', 2, 2], ['A-02', 1, 1], ['A-03', 2, 1]])
  })
  it('falls back deterministically when coordinates are missing', () => {
    const layout = buildSeatLayout([machine('A-10'), machine('A-2'), machine('A-1')])
    expect(layout.configured).toBe(false)
    expect(layout.seats.map(seat => seat.machine.id)).toEqual(['A-1', 'A-2', 'A-10'])
  })
  it('does not overlap seats when coordinates are duplicated or partly missing', () => {
    for (const machines of [[machine('A-1', 0, 0), machine('A-2', 0, 0)], [machine('A-1', 0, 0), machine('A-2')]]) {
      const layout = buildSeatLayout(machines)
      expect(layout.configured).toBe(false)
      expect(new Set(layout.seats.map(seat => `${seat.column}:${seat.row}`)).size).toBe(2)
    }
  })
  it('handles invalid coordinates and empty areas', () => {
    expect(buildSeatLayout([machine('A-1', Infinity, 0)]).configured).toBe(false)
    expect(buildSeatLayout([])).toEqual({ configured: false, columns: 1, seats: [] })
  })
  it('preserves the source array and actual machine statuses', () => {
    const machines = [machine('A-2', 1, 0), { ...machine('A-1', 0, 0), status: 'fault' }]
    const layout = buildSeatLayout(machines)
    expect(machines.map(machine => machine.id)).toEqual(['A-2', 'A-1'])
    expect(layout.seats[0].machine.status).toBe('fault')
  })
})
