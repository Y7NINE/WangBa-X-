<template>
  <div class="seats-page">
    <!-- 顶部导航 -->
    <header class="nav-header">
      <button class="back-btn" @click="$router.push('/')">← 返回</button>
      <h2>选座上机</h2>
      <button class="refresh-btn" @click="loadData">刷新</button>
    </header>

    <!-- 图例 -->
    <div class="legend">
      <span class="legend-item"><span class="dot available"></span>空闲</span>
      <span class="legend-item"><span class="dot using"></span>使用中</span>
      <span class="legend-item"><span class="dot fault"></span>故障</span>
      <span class="legend-item"><span class="dot cleaning"></span>清理中</span>
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

    <!-- 座位列表 -->
    <div class="seats-list">
      <div
        v-for="machine in filteredMachines"
        :key="machine.id"
        class="seat-card"
        :class="machine.status"
        @click="handleSeatClick(machine)"
      >
        <div class="seat-left">
          <div class="seat-icon">💻</div>
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
      </div>
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
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { machineApi, Machine, Area } from '@/api/machine'
import { billingApi } from '@/api/billing'
import { io, Socket } from 'socket.io-client'

const router = useRouter()
const userStore = useUserStore()

const machines = ref<Machine[]>([])
const areas = ref<Area[]>([])
const selectedArea = ref(0)
let socket: Socket | null = null

const areaTabs = computed(() => [
  { id: 0, name: '全部' },
  ...areas.value.map(a => ({ id: a.id, name: a.name }))
])

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
    await ElMessageBox.confirm(`选择 ${machine.id} 上机？`, '确认上机')
    const session = await billingApi.startSession(userStore.user!.id, machine.id)
    userStore.currentSession = session
    ElMessage.success(`已上机 ${machine.id}`)
    router.push('/')
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '上机失败')
  }
}

const loadData = async () => {
  try {
    machines.value = await machineApi.getMachines()
    areas.value = await machineApi.getAreas()
  } catch (e) {
    console.error(e)
  }
}

const connectSocket = () => {
  socket = io('http://localhost:3000')
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
.seats-page {
  min-height: 100vh;
  background: #f5f7fa;
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
  color: #667eea;
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
  color: #999;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.dot.available { background: #4ade80; }
.dot.using { background: #60a5fa; }
.dot.fault { background: #f87171; }
.dot.cleaning { background: #fb923c; }

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
  background: linear-gradient(135deg, #667eea, #764ba2);
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
  color: #999;
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
  background: #dcfce7;
  color: #16a34a;
}

.status-tag.online {
  background: #dbeafe;
  color: #2563eb;
}

.status-tag.fault {
  background: #fee2e2;
  color: #dc2626;
}

.status-tag.dirty, .status-tag.cleaning {
  background: #ffedd5;
  color: #ea580c;
}

.action-hint {
  font-size: 12px;
  color: #667eea;
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

.stat .num.available { color: #4ade80; }
.stat .num.using { color: #60a5fa; }
.stat .num.fault { color: #f87171; }

.stat .label {
  font-size: 12px;
  color: #999;
  display: block;
  margin-top: 2px;
}
</style>
