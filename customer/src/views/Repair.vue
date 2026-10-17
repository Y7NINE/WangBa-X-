<template>
  <div class="repair-container">
    <div class="nav-bar">
      <el-button text @click="$router.push('/')">
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <h3>一键报修</h3>
      <div></div>
    </div>

    <p class="service-note">{{ userStore.currentSession ? `当前座位 ${userStore.currentSession.machineId} · 换机申请需由网管受理` : '当前未上机，可查看历史报修记录。' }}</p>
    <div class="repair-form">
      <div class="section-title">故障类型</div>
      <div class="fault-types">
        <div
          v-for="type in faultTypes"
          :key="type.id"
          class="fault-item"
          :class="{ active: selectedType === type.id }"
          @click="selectedType = type.id"
        >
          <el-icon :size="24"><component :is="type.icon" /></el-icon>
          <span>{{ type.name }}</span>
        </div>
      </div>

      <div class="section-title">问题描述</div>
      <el-input
        v-model="description"
        type="textarea"
        :rows="3"
        placeholder="请描述您遇到的问题（可选）"
      />

      <div class="section-title">处理方式</div>
      <el-radio-group v-model="action" class="action-group">
        <el-radio-button value="wait">等待维修</el-radio-button>
        <el-radio-button value="change">申请换机</el-radio-button>
      </el-radio-group>

      <el-button
        type="primary"
        size="large"
        style="width: 100%; margin-top: 20px"
        :disabled="!selectedType || !userStore.currentSession"
        :loading="submitting"
        @click="submitRepair"
      >
        提交报修
      </el-button>
    </div>
    <section class="ticket-history"><header><h3>我的报修</h3><el-button text @click="loadTickets">刷新进度</el-button></header><p v-if="ticketError" class="service-note" role="alert">{{ ticketError }}</p><p v-else-if="!tickets.length" class="service-note">暂无报修记录。</p><article v-for="ticket in tickets" :key="ticket.id"><header><strong>{{ ticket.machineId }} · {{ faultTypes.find(type => type.id === ticket.faultType)?.name || ticket.faultType }}</strong><span>{{ statusNames[ticket.status] || ticket.status }}</span></header><p>{{ ticket.description || '未填写问题描述' }}</p><p v-if="ticket.newMachineId">已换至 {{ ticket.newMachineId }}，原机器继续维修。</p><small>{{ new Date(ticket.createdAt).toLocaleString('zh-CN', { hour12: false }) }}</small></article></section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { faultApi } from '@/api/fault'

const router = useRouter()
const userStore = useUserStore()

const selectedType = ref('')
const description = ref('')
const action = ref('wait')
const submitting = ref(false)
const tickets = ref<any[]>([])
const ticketError = ref('')
const statusNames: Record<string, string> = { pending: '待受理', accepted: '已受理', processing: '处理中', resolved: '已修复', transferred: '已换机', cancelled: '已取消', escalated: '已升级处理' }

const faultTypes = ref<Array<{id: string; name: string; icon: string}>>([])
const icons: Record<string, string> = { mouse: 'Mouse', keyboard: 'Monitor', headset: 'Headset', monitor: 'Monitor', network: 'Connection', slow: 'Loading', other: 'More' }
async function loadTickets() {
  try { tickets.value = await faultApi.getTickets(); ticketError.value = '' } catch (error: any) { ticketError.value = error.message }
}
let timer: number | undefined
onMounted(async () => {
  try { const types = await api.get<any[]>('/faults/types'); faultTypes.value = types.map(type => ({ ...type, icon: icons[type.id] || 'More' })) } catch (error: any) { ElMessage.error(error.message) }
  loadTickets()
  timer = window.setInterval(loadTickets, 15000)
})
onUnmounted(() => window.clearInterval(timer))

const submitRepair = async () => {
  if (submitting.value) return
  if (!selectedType.value) {
    ElMessage.warning('请选择故障类型')
    return
  }

  if (!userStore.currentSession) {
    ElMessage.warning('您当前没有上机')
    return
  }

  submitting.value = true
  try {
    await faultApi.createTicket({
      machineId: userStore.currentSession.machineId,
      faultType: selectedType.value,
      description: description.value,
      playerAction: action.value === 'change' ? 'request_change' : 'wait_repair',
    })
    ElMessage.success('报修已提交，网管将尽快处理')
    description.value = ''
    selectedType.value = ''
    await loadTickets()
  } catch (error: any) {
    ElMessage.error(error.message || '提交失败')
  } finally { submitting.value = false }
}
</script>

<style scoped lang="scss">
.service-note { font-size:12px; line-height:1.8; margin-bottom:20px; color:var(--ink-soft); }
.ticket-history { margin-top:28px; padding-top:20px; border-top:1px solid var(--rule); }
.ticket-history header { display:flex; justify-content:space-between; align-items:center; gap:12px; font-size:12px; }
.ticket-history h3 { font-family:var(--font-song); font-size:20px; font-weight:500; }.ticket-history strong { font-weight:500; }.ticket-history span { color:var(--pine); }.ticket-history article { padding:18px 0; border-bottom:1px solid var(--rule); }.ticket-history p { color:var(--ink-soft); font-size:12px; margin:12px 0; }.ticket-history small { color:var(--ink-muted); font-size:10px; }

.repair-container {
  padding: 16px;
  max-width: 768px;
  margin: 0 auto;
}

.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  margin-bottom: 20px;

  h3 {
    font-size: 18px;
    color: var(--ink);
  }
}

.repair-form {
  .section-title {
    font-size: 16px;
    color: var(--ink);
    margin-bottom: 12px;
    margin-top: 20px;

    &:first-child {
      margin-top: 0;
    }
  }

  .fault-types {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;

    .fault-item {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px 12px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      border: 2px solid transparent;

      .el-icon {
        display: block;
        margin: 0 auto 8px;
        color: #77796b;
      }

      span {
        font-size: 12px;
        color: var(--ink);
      }

      &.active {
        border-color: #536953;
        background: rgba(64, 158, 255, 0.2);

        .el-icon {
          color: #536953;
        }
      }

      &:hover {
        background: rgba(255, 255, 255, 0.15);
      }
    }
  }

  .action-group {
    width: 100%;

    .el-radio-button {
      width: 50%;
    }
  }
}
</style>
