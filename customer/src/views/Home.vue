<template>
  <div class="page">
    <!-- 头部 -->
    <div class="top">
      <div class="logo">🎮 电竞馆</div>
      <div class="info">
        <span class="dot"></span>
        <span>{{ onlineCount }}人在线</span>
        <span v-if="userStore.isLoggedIn" class="avatar" @click="$router.push('/profile')">
          {{ userStore.user?.nickname?.charAt(0) }}
        </span>
        <span v-else class="btn-login" @click="$router.push('/login')">登录</span>
      </div>
    </div>

    <!-- 上机卡片 -->
    <div v-if="userStore.currentSession" class="card active-card">
      <div class="card-row">
        <div class="card-label">当前座位</div>
        <div class="card-value">{{ userStore.currentSession.machineId }}</div>
      </div>
      <div class="card-row split">
        <div>
          <div class="card-label">已用时</div>
          <div class="card-value">{{ formatDuration(userStore.currentSession.duration) }}</div>
        </div>
        <div>
          <div class="card-label">费用</div>
          <div class="card-value red">¥{{ userStore.currentSession.amount }}</div>
        </div>
      </div>
      <div class="card-actions">
        <button class="btn" @click="$router.push('/repair')">报修</button>
        <button class="btn primary" @click="handleEndSession">下机结算</button>
      </div>
    </div>

    <!-- 功能 -->
    <div class="grid">
      <div class="item" @click="$router.push('/seats')">
        <div class="item-icon">💻</div>
        <div class="item-text">选座上机</div>
      </div>
      <div class="item" @click="$router.push('/menu')">
        <div class="item-icon">☕</div>
        <div class="item-text">水吧点单</div>
      </div>
      <div class="item" @click="$router.push('/repair')">
        <div class="item-icon">🔧</div>
        <div class="item-text">一键报修</div>
      </div>
      <div class="item" @click="$router.push('/profile')">
        <div class="item-icon">👤</div>
        <div class="item-text">个人中心</div>
      </div>
    </div>

    <!-- 网吧布局缩略图 -->
    <div class="block">
      <div class="block-title">
        <span>网吧布局</span>
        <span class="link" @click="$router.push('/seats')">选座上机</span>
      </div>
      
      <div class="floor-map">
        <!-- 入口 -->
        <div class="entrance">入口</div>
        
        <!-- 收银台 -->
        <div class="counter">收银台</div>
        
        <!-- 竞技区 -->
        <div class="area-block area-a">
          <div class="area-label">竞技区 ¥15/h</div>
          <div class="area-seats">
            <span
              v-for="m in getAreaMachines(1)"
              :key="m.id"
              class="map-seat"
              :class="m.status"
              @click="handleSeatClick(m)"
            >{{ m.id }}</span>
          </div>
        </div>
        
        <!-- 休闲区 -->
        <div class="area-block area-b">
          <div class="area-label">休闲区 ¥10/h</div>
          <div class="area-seats">
            <span
              v-for="m in getAreaMachines(2)"
              :key="m.id"
              class="map-seat"
              :class="m.status"
              @click="handleSeatClick(m)"
            >{{ m.id }}</span>
          </div>
        </div>
        
        <!-- 包间 -->
        <div class="area-block area-c">
          <div class="area-label">包间 ¥20/h</div>
          <div class="rooms">
            <div class="room" v-for="i in 3" :key="i">
              <div class="room-name">包间{{ i }}</div>
              <div class="room-seats">
                <span
                  v-for="j in 2"
                  :key="`${i}-${j}`"
                  class="map-seat"
                  :class="getRoomMachine(i, j)?.status"
                  @click="getRoomMachine(i, j) && handleSeatClick(getRoomMachine(i, j)!)"
                >{{ getRoomMachine(i, j)?.id }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 水吧 -->
        <div class="bar">水吧</div>
      </div>
    </div>

    <!-- 图例 -->
    <div class="legend">
      <span><i class="i-green"></i>空闲</span>
      <span><i class="i-blue"></i>使用中</span>
      <span><i class="i-red"></i>故障</span>
      <span><i class="i-yellow"></i>清理中</span>
    </div>

    <!-- 底部统计 -->
    <div class="bottom">
      <div><strong>{{ totalMachines }}</strong><small>总座位</small></div>
      <div><strong class="green">{{ availableCount }}</strong><small>空闲</small></div>
      <div><strong class="blue">{{ usingCount }}</strong><small>使用中</small></div>
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
let socket: Socket | null = null

const totalMachines = computed(() => machines.value.length)
const onlineCount = computed(() => machines.value.filter(m => m.status === 'online').length)
const availableCount = computed(() => machines.value.filter(m => m.status === 'offline').length)
const usingCount = computed(() => machines.value.filter(m => m.status === 'online').length)

const getAreaMachines = (areaId: number) => machines.value.filter(m => m.areaId === areaId)

const getRoomMachine = (room: number, seat: number) => {
  const id = `C-0${(room - 1) * 2 + seat}`
  return machines.value.find(m => m.id === id)
}

const formatDuration = (min: number) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}小时${m}分` : `${m}分钟`
}

const handleSeatClick = async (machine: Machine) => {
  if (machine.status !== 'offline') {
    const msg: Record<string, string> = { online: '使用中', fault: '故障', dirty: '待清理', cleaning: '清理中' }
    ElMessage.info(`${machine.id} ${msg[machine.status] || ''}`)
    return
  }
  if (!userStore.isLoggedIn) { router.push('/login'); return }
  try {
    await ElMessageBox.confirm(`选择 ${machine.id} 上机？`, '确认')
    const s = await billingApi.startSession(userStore.user!.id, machine.id)
    userStore.currentSession = s
    ElMessage.success('上机成功')
    loadData()
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e.message) }
}

const handleEndSession = async () => {
  if (!userStore.currentSession) return
  try {
    await ElMessageBox.confirm('确定下机？', '确认')
    const r = await billingApi.endSession(userStore.currentSession.id)
    userStore.currentSession = null
    ElMessage.success(`结算 ¥${r.amount}`)
    loadData()
  } catch {}
}

const loadData = async () => {
  try {
    machines.value = await machineApi.getMachines()
    areas.value = await machineApi.getAreas()
  } catch (e) { console.error(e) }
}

const connectSocket = () => {
  socket = io('http://localhost:3000')
  socket.on('machine_status_update', (d) => {
    const m = machines.value.find(m => m.id === d.machine_id)
    if (m) m.status = d.status
  })
}

onMounted(() => { loadData(); connectSocket() })
onUnmounted(() => socket?.disconnect())
</script>

<style scoped>
.page {
  padding: 16px;
  background: #f5f5f5;
  min-height: 100vh;
}

.top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.logo {
  font-size: 20px;
  font-weight: 700;
  color: #111;
}

.info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: #666;
}

.dot {
  width: 8px;
  height: 8px;
  background: #22c55e;
  border-radius: 50%;
}

.avatar {
  width: 30px;
  height: 30px;
  background: #e5e7eb;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  cursor: pointer;
}

.btn-login {
  color: #2563eb;
  cursor: pointer;
}

.card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.active-card {
  border-left: 4px solid #2563eb;
}

.card-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.card-row.split {
  display: flex;
  gap: 24px;
}

.card-row.split > div {
  flex: 1;
}

.card-label {
  font-size: 12px;
  color: #999;
}

.card-value {
  font-size: 18px;
  font-weight: 600;
  color: #111;
  margin-top: 2px;
}

.card-value.red {
  color: #ef4444;
}

.card-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.btn {
  flex: 1;
  padding: 10px;
  border: 1px solid #e5e7eb;
  background: #fff;
  border-radius: 8px;
  font-size: 14px;
  cursor: pointer;
}

.btn.primary {
  background: #2563eb;
  color: #fff;
  border-color: #2563eb;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.item {
  background: #fff;
  border-radius: 12px;
  padding: 16px 8px;
  text-align: center;
  cursor: pointer;
}

.item-icon {
  font-size: 28px;
  margin-bottom: 6px;
}

.item-text {
  font-size: 12px;
  color: #666;
}

.block {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.block-title {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
  font-size: 15px;
  font-weight: 600;
  color: #111;
}

.link {
  font-size: 13px;
  font-weight: 400;
  color: #2563eb;
  cursor: pointer;
}

/* 网吧布局图 */
.floor-map {
  background: #fafafa;
  border-radius: 8px;
  padding: 16px;
  position: relative;
}

.entrance {
  text-align: center;
  padding: 8px;
  background: #e5e7eb;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 12px;
  color: #666;
}

.counter {
  text-align: center;
  padding: 10px;
  background: #1f2937;
  color: #fff;
  border-radius: 6px;
  margin-bottom: 16px;
  font-size: 13px;
}

.area-block {
  margin-bottom: 16px;
  padding: 12px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.area-label {
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  margin-bottom: 10px;
}

.area-seats {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.map-seat {
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.15s;
}

.map-seat:hover {
  transform: scale(1.05);
}

.map-seat.offline {
  background: #dcfce7;
  color: #16a34a;
}

.map-seat.online {
  background: #dbeafe;
  color: #2563eb;
}

.map-seat.fault {
  background: #fee2e2;
  color: #dc2626;
}

.map-seat.dirty, .map-seat.cleaning {
  background: #fef9c3;
  color: #ca8a04;
}

.rooms {
  display: flex;
  gap: 10px;
}

.room {
  flex: 1;
  padding: 10px;
  background: #f9fafb;
  border-radius: 6px;
  border: 1px dashed #d1d5db;
}

.room-name {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 8px;
  text-align: center;
}

.room-seats {
  display: flex;
  gap: 6px;
  justify-content: center;
}

.bar {
  text-align: center;
  padding: 10px;
  background: linear-gradient(135deg, #fbbf24, #f59e0b);
  color: #fff;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
}

.legend {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-bottom: 16px;
  font-size: 12px;
  color: #999;
}

.legend span {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend i {
  width: 10px;
  height: 10px;
  border-radius: 3px;
  display: inline-block;
}

.i-green { background: #22c55e; }
.i-blue { background: #2563eb; }
.i-red { background: #ef4444; }
.i-yellow { background: #ca8a04; }

.bottom {
  display: flex;
  justify-content: space-around;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
}

.bottom div {
  text-align: center;
}

.bottom strong {
  display: block;
  font-size: 24px;
  color: #111;
}

.bottom .green { color: #22c55e; }
.bottom .blue { color: #2563eb; }

.bottom small {
  font-size: 12px;
  color: #999;
}
</style>
