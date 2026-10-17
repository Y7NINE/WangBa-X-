<template>
  <div class="profile-container">
    <div class="nav-bar">
      <el-button text @click="$router.push('/')">
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <h3>个人中心</h3>
      <el-button text @click="handleLogout">退出</el-button>
    </div>

    <div v-if="userStore.user" class="user-card">
      <el-avatar :size="64">{{ userStore.user.nickname?.charAt(0) || 'U' }}</el-avatar>
      <div class="user-info">
        <div class="nickname">{{ userStore.user.nickname }}</div>
        <div class="phone">{{ userStore.user.phone }}</div>
        <el-tag :type="getLevelType(userStore.user.memberLevel)">
          {{ getLevelName(userStore.user.memberLevel) }}
        </el-tag>
      </div>
    </div>

    <div class="stats-card">
      <div class="stat-item">
        <div class="stat-value">¥{{ userStore.user?.balance || 0 }}</div>
        <div class="stat-label">账户余额</div>
      </div>
      <div class="stat-item">
        <div class="stat-value">{{ userStore.user?.credits || 0 }}</div>
        <div class="stat-label">积分</div>
      </div>
    </div>

    <!-- 当前上机 -->
    <div v-if="userStore.currentSession" class="session-card">
      <div class="session-title">当前上机</div>
      <div class="session-row">
        <span class="label">座位</span>
        <span class="value">{{ userStore.currentSession.machineId }}</span>
      </div>
      <div class="session-row">
        <span class="label">开始时间</span>
        <span class="value">{{ formatTime(userStore.currentSession.startTime) }}</span>
      </div>
      <div class="session-row">
        <span class="label">状态</span>
        <el-tag size="small" :type="userStore.currentSession.status === 'active' ? 'success' : 'warning'">
          {{ userStore.currentSession.status === 'active' ? '使用中' : '已暂停' }}
        </el-tag>
      </div>
      <div class="session-row">
        <span class="label">当前费用</span>
        <span class="value amount">¥{{ userStore.currentSession.amount || 0 }}</span>
      </div>
      <el-button type="danger" style="width: 100%; margin-top: 12px" @click="handleEndSession">
        下机结算
      </el-button>
    </div>

    <div class="menu-list">
      <div class="menu-item" @click="$router.push('/seats')">
        <el-icon><Monitor /></el-icon>
        <span>我的上机</span>
        <el-icon><ArrowRight /></el-icon>
      </div>
      <div class="menu-item" @click="recordTab = 'transactions'; loadRecords()">
        <el-icon><Wallet /></el-icon>
        <span>消费与充值记录</span>
        <el-icon><ArrowRight /></el-icon>
      </div>
      <div class="menu-item" @click="$router.push('/repair')">
        <el-icon><Warning /></el-icon>
        <span>报修与处理进度</span>
        <el-icon><ArrowRight /></el-icon>
      </div>
      <div class="menu-item" @click="$router.push('/menu')">
        <el-icon><Coffee /></el-icon>
        <span>点单与配送记录</span>
        <el-icon><ArrowRight /></el-icon>
      </div>
    </div>
    <section class="record-section"><header><h3>{{ recordTab === 'sessions' ? '上机记录' : '消费与充值记录' }}</h3><button @click="recordTab = recordTab === 'sessions' ? 'transactions' : 'sessions'; loadRecords()">{{ recordTab === 'sessions' ? '查看流水' : '查看上机' }}</button></header><p v-if="recordsError" class="record-note" role="alert">{{ recordsError }}</p><p v-else-if="!records.length" class="record-note">暂无记录。</p><article v-for="record in records" :key="record.id"><header><strong>{{ recordTab === 'sessions' ? record.machineId : record.description }}</strong><span>{{ recordTab === 'sessions' && record.status !== 'completed' ? '未结算' : `¥${Number(record.amount).toFixed(2)}` }}</span></header><small>{{ formatTime(record.startTime || record.createdAt) }} · {{ recordTab === 'sessions' ? (record.status === 'completed' ? '已结算' : record.status === 'paused' ? '暂停中' : '进行中') : `余额 ¥${Number(record.balanceAfter).toFixed(2)}` }}</small></article></section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import api from '@/api'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()
const recordTab = ref('sessions')
const records = ref<any[]>([])
const recordsError = ref('')
async function loadRecords() {
  try { records.value = await api.get(recordTab.value === 'sessions' ? '/billing/history' : '/billing/transactions'); recordsError.value = '' }
  catch (error: any) { recordsError.value = error.message }
}

const getLevelType = (level: string) => {
  const map: Record<string, 'info' | 'warning' | 'danger' | 'success' | 'primary'> = {
    normal: 'info',
    silver: 'info',
    gold: 'warning',
    diamond: 'danger',
  }
  return map[level] || 'info'
}

const getLevelName = (level: string) => {
  const map: Record<string, string> = {
    normal: '普通会员',
    silver: '白银会员',
    gold: '黄金会员',
    diamond: '钻石会员',
  }
  return map[level] || level
}

const formatTime = (t?: string) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN', { hour12: false })
}

const handleEndSession = async () => {
  if (!userStore.currentSession) return
  try {
    await ElMessageBox.confirm('确定下机并结算？', '确认')
    const r = await userStore.endCurrentSession()
    ElMessage.success(`结算 ¥${r?.amount ?? 0}`)
    loadRecords()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '结算失败')
  }
}

const handleLogout = async () => {
  await userStore.logout()
  ElMessage.success('已退出登录')
  router.push('/')
}

onMounted(() => {
  userStore.loadCurrentSession()
  userStore.refreshProfile()
  loadRecords()
})
</script>

<style scoped lang="scss">
.record-section { margin-top:28px; padding-top:20px; border-top:1px solid var(--rule); }
.record-section header { display:flex; justify-content:space-between; align-items:center; gap:12px; font-size:12px; }.record-section h3 { font-family:var(--font-song); font-size:20px; font-weight:500; }.record-section button { min-height:40px; border:0; background:none; color:var(--pine); cursor:pointer; }.record-section article { padding:18px 0; border-bottom:1px solid var(--rule); }.record-section strong { font-weight:500; }.record-section small,.record-note { display:block; font-size:11px; color:var(--ink-muted); line-height:1.8; margin-top:10px; }

.profile-container {
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

.user-card {
  background: linear-gradient(135deg, #1e3a5f, #2a5298);
  border-radius: 16px;
  padding: 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;

  .user-info {
    .nickname {
      font-size: 20px;
      font-weight: bold;
      margin-bottom: 4px;
    }

    .phone {
      font-size: 14px;
      color: #77796b;
      margin-bottom: 8px;
    }
  }
}

.stats-card {
  display: flex;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;

  .stat-item {
    flex: 1;
    text-align: center;

    &:first-child {
      border-right: 1px solid rgba(255, 255, 255, 0.2);
    }

    .stat-value {
      font-size: 24px;
      font-weight: bold;
      color: #a34738;
    }

    .stat-label {
      font-size: 14px;
      color: #77796b;
      margin-top: 4px;
    }
  }
}

.session-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 16px 20px;
  margin-bottom: 20px;

  .session-title {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 12px;
  }

  .session-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 0;

    .label {
      font-size: 13px;
      color: #77796b;
    }

    .value {
      font-size: 14px;
      font-weight: 500;

      &.amount {
        color: #a34738;
        font-size: 18px;
        font-weight: bold;
      }
    }
  }
}

.menu-list {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  overflow: hidden;

  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 16px 20px;
    cursor: pointer;
    transition: background 0.3s;

    &:hover {
      background: rgba(255, 255, 255, 0.05);
    }

    &:not(:last-child) {
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    span {
      flex: 1;
      font-size: 16px;
    }

    .el-icon:last-child {
      color: #77796b;
    }
  }
}
</style>
