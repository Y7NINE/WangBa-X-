<template>
  <section class="hall" aria-label="大厅座位示意图">
    <header class="hall-heading"><div><span>座席小览</span><h3>大厅示意</h3></div><span class="hall-seal" aria-hidden="true">席</span></header>
    <p class="hall-caption">分区示意，可点选空闲座位。实际位置以门店为准。</p>
    <div class="entry-mark"><span>入 口</span><i></i></div>
    <div class="service-desk"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h18v11H3zM6 4h8v5M2 20h20M7 13h3"/></svg><span>前台 · 服务台</span></div>
    <div class="hall-zones">
      <article v-for="zone in zones" :key="zone.area.id" class="hall-zone" :aria-label="zone.area.name">
        <header><h4>{{ zone.area.name }}</h4><span>¥{{ Number(zone.area.pricePerHour).toFixed(2) }}/时 · 余 {{ zone.free }} 席</span></header>
        <div class="seat-scroll" tabindex="0" :aria-label="`${zone.area.name}座位分布，可左右滚动`"><div class="seat-grid" :style="{ gridTemplateColumns: `repeat(${zone.layout.columns}, minmax(52px, 1fr))` }">
          <button v-for="seat in zone.layout.seats" :key="seat.machine.id" class="hall-seat" :class="seat.machine.status" :style="{ gridColumn: seat.column, gridRow: seat.row }" :disabled="busy || seat.machine.status !== 'offline'" :aria-label="`${seat.machine.id} ${statusText(seat.machine.status)}`" @click="$emit('select', seat.machine)"><svg viewBox="0 0 28 26" aria-hidden="true"><rect x="4" y="3" width="20" height="13" rx="1"/><path d="M14 16v4m-5 0h10M7 24h14"/></svg><strong>{{ seat.machine.id }}</strong><small>{{ statusText(seat.machine.status) }}</small></button>
        </div></div>
        <p v-if="!zone.layout.seats.length" class="zone-empty">该区域暂未配置座位</p>
        <div class="aisle"><span>通 道</span></div>
        <small class="position-note">{{ zone.layout.configured ? '区域座位示意' : '座位位置待门店确认' }}</small>
      </article>
    </div>
    <div class="hall-bottom"><span>茶饮 · 取餐</span><span>布局示意 · 以店内为准</span></div>
  </section>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import type { Area, Machine } from '@/api/machine'
import { buildSeatLayout } from '@/utils/seat-layout'
const props = defineProps<{ areas: Area[]; machines: Machine[]; busy?: boolean }>()
defineEmits<{ select: [machine: Machine] }>()
const zones = computed(() => props.areas.map(area => {
  const machines = props.machines.filter(machine => machine.areaId === area.id)
  return { area, free: machines.filter(machine => machine.status === 'offline').length, layout: buildSeatLayout(machines) }
}))
const statusText = (status: string) => ({ offline: '空闲', online: '使用中', fault: '故障', dirty: '待清理', cleaning: '清理中', repairing: '维修中', maintenance: '维护中' }[status] || '不可用')
</script>
<style scoped>
.hall{margin:0 18px 22px;padding:22px 18px 15px;border:1px solid var(--rule);background:var(--paper-light)}.hall-heading{display:flex;align-items:center;justify-content:space-between}.hall-heading>div>span{font-size:10px;letter-spacing:3px;color:var(--ink-muted)}h3{font:500 24px var(--font-song);letter-spacing:3px;margin-top:7px}.hall-seal{display:grid;place-items:center;width:28px;height:32px;color:var(--cinnabar);border:1px solid var(--cinnabar);font:20px var(--font-song);transform:rotate(-3deg)}.hall-caption{font-size:10px;line-height:1.9;color:var(--ink-muted);margin:14px 0 22px}.entry-mark{text-align:center;font:13px var(--font-song);letter-spacing:3px;color:var(--ink-soft)}.entry-mark span{display:inline-block;padding:6px 30px;border-block:1px solid var(--rule)}.entry-mark i{display:block;height:18px;width:1px;background:var(--rule);margin:auto}.service-desk{display:flex;justify-content:center;align-items:center;gap:9px;margin:0 auto 22px;padding:12px;max-width:190px;border:1px solid #b9b9a7;background:#ebeadd;font-size:11px;color:var(--ink-soft);letter-spacing:2px}.service-desk svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.1}.hall-zones{display:grid;gap:18px}.hall-zone{border:1px solid var(--rule);padding:16px 12px 9px;background:#f7f4ec}.hall-zone header{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:18px}h4{font:500 17px var(--font-song);letter-spacing:1px}.hall-zone header>span{font-size:9px;color:var(--ink-muted);white-space:nowrap}.seat-scroll{overflow-x:auto;padding:3px;scrollbar-width:thin}.seat-grid{display:grid;gap:11px 8px}.hall-seat{min-height:78px;min-width:52px;background:#e9eddf;border:1px solid #a6b497;border-radius:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#435d40;padding:7px 2px;cursor:pointer;transition:background .15s,border-color .15s}.hall-seat svg{width:27px;height:25px;fill:none;stroke:currentColor;stroke-width:1.1}.hall-seat strong{font-size:11px;line-height:1.7;font-weight:500;font-variant-numeric:tabular-nums}.hall-seat small{font-size:8px;color:inherit}.hall-seat.offline:hover{background:#d9e2cb;border-color:#536953}.hall-seat:focus-visible,.seat-scroll:focus-visible{outline:2px solid var(--cinnabar);outline-offset:2px}.hall-seat:disabled{cursor:default}.hall-seat.online{background:#e5e9e9;border-color:#acb9bc;color:#627782}.hall-seat.fault,.hall-seat.repairing{background:#f0e3dc;border-color:#c8a296;color:#985747}.hall-seat.dirty,.hall-seat.cleaning{background:#eee7d6;border-color:#c4b38c;color:#917443}.hall-seat.maintenance{background:#e8e5de;border-color:#b7b2a6;color:#797567}.aisle{position:relative;text-align:center;margin:15px 0 9px;border-top:1px dashed #d9d4c6;height:0}.aisle span{position:relative;top:-7px;padding:0 15px;background:#f7f4ec;font-size:8px;color:#9b998b;letter-spacing:5px}.position-note{display:block;color:#8c8c7d;text-align:right;font-size:8px}.hall-bottom{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:20px;border-top:1px solid var(--rule);padding-top:12px;color:var(--ink-muted);font-size:9px}.hall-bottom span:first-child{font:12px var(--font-song);letter-spacing:1px}.zone-empty{font-size:11px;color:var(--ink-muted);padding:12px 0}@media(max-width:360px){.hall{margin-inline:12px;padding:18px 12px}.hall-zone{padding-inline:8px}.seat-grid{gap:8px 5px}.hall-zone header>span{font-size:8px}}
</style>
