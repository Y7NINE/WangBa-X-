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

    <div class="menu-list">
      <div class="menu-item" @click="$router.push('/seats')">
        <el-icon><Monitor /></el-icon>
        <span>我的上机</span>
        <el-icon><ArrowRight /></el-icon>
      </div>
      <div class="menu-item">
        <el-icon><Wallet /></el-icon>
        <span>充值记录</span>
        <el-icon><ArrowRight /></el-icon>
      </div>
      <div class="menu-item" @click="$router.push('/repair')">
        <el-icon><Warning /></el-icon>
        <span>报修记录</span>
        <el-icon><ArrowRight /></el-icon>
      </div>
      <div class="menu-item">
        <el-icon><Setting /></el-icon>
        <span>个人设置</span>
        <el-icon><ArrowRight /></el-icon>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const getLevelType = (level: string) => {
  const map: Record<string, string> = {
    normal: 'info',
    silver: '',
    gold: 'warning',
    diamond: 'danger',
  }
  return map[level] || ''
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

const handleLogout = () => {
  userStore.logout()
  ElMessage.success('已退出登录')
  router.push('/')
}
</script>

<style scoped lang="scss">
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
    color: #fff;
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
      color: #909399;
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
      color: #e6a23c;
    }
    
    .stat-label {
      font-size: 14px;
      color: #909399;
      margin-top: 4px;
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
      color: #909399;
    }
  }
}
</style>
