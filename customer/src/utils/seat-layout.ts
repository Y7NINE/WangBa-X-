import type { Machine } from '@/api/machine'

export function buildSeatLayout(machines: Machine[]) {
  const sorted = [...machines].sort((a, b) => a.id.localeCompare(b.id, 'zh-CN', { numeric: true }))
  const positioned = sorted.length > 0 && sorted.every(m => typeof m.positionX === 'number' && Number.isFinite(m.positionX) && typeof m.positionY === 'number' && Number.isFinite(m.positionY))
  const keys = new Set(sorted.map(m => `${m.positionX}:${m.positionY}`))
  const xs = [...new Set(sorted.map(m => m.positionX as number))].sort((a, b) => a - b)
  const ys = [...new Set(sorted.map(m => m.positionY as number))].sort((a, b) => a - b)
  const configured = positioned && keys.size === sorted.length && xs.length <= 12 && ys.length <= 20
  const columns = configured ? xs.length : Math.min(4, Math.max(1, sorted.length))
  return {
    configured,
    columns,
    seats: sorted.map((machine, index) => ({ machine, column: configured ? xs.indexOf(machine.positionX!) + 1 : index % columns + 1, row: configured ? ys.indexOf(machine.positionY!) + 1 : Math.floor(index / columns) + 1 })),
  }
}
