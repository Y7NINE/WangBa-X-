<template>
  <div class="seats-page">
    <!-- 顶部导航 -->
    <header class="nav-header">
      <button class="back-btn" @click="$router.push('/')">← 返回</button>
      <h2>选座上机</h2>
      <button class="refresh-btn" @click="loadData">刷新</button>
    </header>

    <div class="view-toolbar"><div class="view-tabs" role="group" aria-label="座位视图"><button :class="{ active: viewMode === 'hall' }" :aria-pressed="viewMode === 'hall'" @click="viewMode = 'hall'">大厅示意</button><button :class="{ active: viewMode === 'list' }" :aria-pressed="viewMode === 'list'" @click="viewMode = 'list'">座位列表</button></div><span>选一席，自在开局</span></div>
    <!-- 图例 -->
    <div class="legend">
      <span class="legend-item"><span class="dot available"></span>空闲</span>
      <span class="legend-item"><span class="dot using"></span>使用中</span>
      <span class="legend-item"><span class="dot fault"></span>故障</span>
      <span class="legend-item"><span class="dot cleaning"></span>待清理 / 清理中</span>
    </div>

    <!-- 区域筛选 -->
    <div class="area-tabs">
      <button
        v-for="tab in areaTabs"
        :key="tab.id"
        :class="{ active: selectedArea === tab.id }"
        @click="selectedArea = tab.id"
      >
        {{ tab.name }}
      </button>
    </div>

    <p v-if="loading" class="seat-feedback" role="status">正在查看座位…</p>
    <p v-else-if="loadError" class="seat-feedback" role="alert">{{ loadError }}</p>
    <p v-else-if="!filteredMachines.length" class="seat-feedback">当前区域暂无座位，请尝试其他区域。</p>

    <SeatHall v-if="viewMode === 'hall' && !loading && !loadError && filteredMachines.length" :areas="visibleAreas" :machines="filteredMachines" :busy="starting" @select="handleSeatClick" />
    <!-- 座位列表 -->
    <div v-if="viewMode === 'list' && !loading && !loadError" class="seats-list">
      <button
        v-for="machine in filteredMachines"
        :key="machine.id"
        class="seat-card"
        :class="machine.status"
        :disabled="starting || machine.status !== 'offline'"
        @click="handleSeatClick(machine)"
      >
        <div class="seat-left">
          <svg class="seat-icon" viewBox="0 0 28 28" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.2" aria-hidden="true"><rect x="3" y="4" width="22" height="15" rx="1"/><path d="M14 19v5m-6 0h12"/></svg>
          <div class="seat-info">
            <div class="seat-id">{{ machine.id }}</div>
            <div class="seat-area">{{ getAreaName(machine.areaId) }}</div>
          </div>
        </div>
        <div class="seat-right">
          <span class="status-tag" :class="machine.status">
            {{ getStatusText(machine.status) }}
          </span>
          <span v-if="machine.status === 'offline'" class="action-hint">点击上机 ›</span>
        </div>
      </button>
    </div>

    <!-- 底部统计 -->
    <div class="bottom-stats">
      <div class="stat">
        <span class="num available">{{ availableCount }}</span>
        <span class="label">空闲</span>
      </div>
      <div class="stat">
        <span class="num using">{{ usingCount }}</span>
        <span class="label">使用中</span>
      </div>
      <div class="stat">
        <span class="num fault">{{ faultCount }}</span>
        <span class="label">故障</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SeatHall from '@/components/SeatHall.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { machineApi, Machine, Area } from '@/api/machine'
import { billingApi } from '@/api/billing'
import { io, Socket } from 'socket.io-client'

const router = useRouter()
const userStore = useUserStore()

const machines = ref<Machine[]>([])
const loading = ref(false)
const loadError = ref('')
const starting = ref(false)
const viewMode = ref<'hall' | 'list'>('hall')
const areas = ref<Area[]>([])
const route = useRoute()
const requestedArea = Number(route.query.area)
const selectedArea = ref(Number.isInteger(requestedArea) && requestedArea > 0 ? requestedArea : 0)
let socket: Socket | null = null

const areaTabs = computed(() => [
  { id: 0, name: '全部' },
  ...areas.value.map(a => ({ id: a.id, name: a.name }))
])

const visibleAreas = computed(() => areas.value.filter(area => selectedArea.value === 0 || area.id === selectedArea.value))

const filteredMachines = computed(() => {
  if (selectedArea.value === 0) return machines.value
  return machines.value.filter(m => m.areaId === selectedArea.value)
})

const availableCount = computed(() => machines.value.filter(m => m.status === 'offline').length)
const usingCount = computed(() => machines.value.filter(m => m.status === 'online').length)
const faultCount = computed(() => machines.value.filter(m => m.status === 'fault').length)

const getAreaName = (areaId: number) => areas.value.find(a => a.id === areaId)?.name || ''

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    online: '使用中',
    offline: '空闲',
    fault: '故障',
    dirty: '待清理',
    cleaning: '清理中'
  }
  return map[status] || status
}

const handleSeatClick = async (machine: Machine) => {
  if (starting.value) return
  if (userStore.currentSession) { ElMessage.info('你已有上机会话，可在首页查看或结算'); router.push('/'); return }
  if (machine.status !== 'offline') {
    ElMessage.info(`${machine.id} ${getStatusText(machine.status)}`)
    return
  }

  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    router.push('/login')
    return
  }

  try {
    await ElMessageBox.confirm(`选择 ${machine.id} 上机？按区域单价计费，不足1分钟按1分钟计算；下机前请确认余额充足。`, '确认上机')
    starting.value = true
    const session = await billingApi.startSession(userStore.user!.id, machine.id)
    userStore.currentSession = session
    ElMessage.success(`已上机 ${machine.id}`)
    router.push('/')
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error(e.message || '上机失败')
    loadData()
  } finally { starting.value = false }
}

const loadData = async () => {
  if (loading.value) return
  loading.value = true
  loadError.value = ''
  try {
    const [machineList, areaList] = await Promise.all([machineApi.getMachines(), machineApi.getAreas()])
    machines.value = machineList
    areas.value = areaList
    if (selectedArea.value && !areas.value.some(a => a.id === selectedArea.value)) selectedArea.value = 0
  } catch (e) {
    loadError.value = '座位暂时加载失败，请点击右上角刷新重试。'
  } finally { loading.value = false }
}

const connectSocket = () => {
  socket = io({ path: '/socket.io' })
  socket.on('connect', loadData)
  socket.on('machine_status_update', (data) => {
    const m = machines.value.find(m => m.id === data.machine_id)
    if (m) m.status = data.status
  })
}

onMounted(() => {
  loadData()
  connectSocket()
})

onUnmounted(() => {
  socket?.disconnect()
})
</script>

<style scoped>
.view-toolbar { display:flex;align-items:center;justify-content:space-between;gap:10px;padding:18px 20px 10px; }.view-toolbar>span { font:11px var(--font-song);color:var(--ink-muted);letter-spacing:1px; }.view-tabs { display:flex;gap:2px;padding:3px;border:1px solid var(--rule); }.view-tabs button { border:0;background:none;color:var(--ink-soft);padding:9px 13px;min-height:38px;font-size:12px;cursor:pointer; }.view-tabs button.active { background:var(--ink);color:var(--paper-light); }.view-tabs button:focus-visible { outline:2px solid var(--cinnabar);outline-offset:2px; }.legend { flex-wrap:wrap;gap:10px!important; }.seat-card { width:100%;text-align:left;border:1px solid var(--rule);color:var(--ink);font:inherit; }.seat-card:disabled { cursor:default; }.seat-card:focus-visible { outline:2px solid var(--cinnabar);outline-offset:2px; }

.seat-feedback { margin:24px 20px; padding:24px 16px; border-block:1px solid var(--rule); font-size:13px; line-height:1.8; color:var(--ink-soft); }

.seats-page {
  min-height: 100vh;
  background: #f4f0e6;
  padding-bottom: 80px;
}

.nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #fff;
  position: sticky;
  top: 0;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
}

.nav-header h2 {
  font-size: 17px;
  font-weight: 600;
}

.back-btn, .refresh-btn {
  background: none;
  border: none;
  color: #536953;
  font-size: 14px;
  cursor: pointer;
}

.legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  padding: 12px;
  background: #fff;
  margin-bottom: 8px;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #77796b;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.dot.available { background: #6e8566; }
.dot.using { background: #748892; }
.dot.fault { background: #a85e4e; }
.dot.cleaning { background: #a48b55; }

.area-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  background: #fff;
  margin-bottom: 8px;
}

.area-tabs button {
  padding: 8px 16px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.area-tabs button.active {
  background: var(--ink);
  color: #fff;
  border-color: transparent;
}

.seats-list {
  padding: 0 16px;
}

.seat-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: #fff;
  border-radius: 12px;
  margin-bottom: 8px;
  transition: all 0.2s;
  cursor: pointer;
}

.seat-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.06);
}

.seat-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.seat-icon {
  font-size: 24px;
}

.seat-id {
  font-size: 16px;
  font-weight: 600;
}

.seat-area {
  font-size: 12px;
  color: #77796b;
  margin-top: 2px;
}

.seat-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-tag {
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
}

.status-tag.offline {
  background: #e5eadb;
  color: #4e6846;
}

.status-tag.online {
  background: #e1e7e7;
  color: #526b77;
}

.status-tag.fault {
  background: #f1e3dc;
  color: #a34738;
}

.status-tag.dirty, .status-tag.cleaning {
  background: #efe7d4;
  color: #8d713c;
}

.action-hint {
  font-size: 12px;
  color: #536953;
}

.bottom-stats {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  justify-content: space-around;
  padding: 16px;
  background: #fff;
  box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
  max-width: 480px;
  margin: 0 auto;
}

.stat {
  text-align: center;
}

.stat .num {
  font-size: 20px;
  font-weight: 700;
}

.stat .num.available { color: #6e8566; }
.stat .num.using { color: #748892; }
.stat .num.fault { color: #a85e4e; }

.stat .label {
  font-size: 12px;
  color: #77796b;
  display: block;
  margin-top: 2px;
}
</style>
