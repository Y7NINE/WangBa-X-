<template>
  <div class="layout-container">
    <!-- 侧边栏 -->
    <div class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="logo">
        <span v-if="!isCollapsed">网吧管理系统</span>
        <span v-else>网</span>
      </div>
      
      <el-menu
        :default-active="currentRoute"
        :collapse="isCollapsed"
        :router="true"
        background-color="#304156"
        text-color="#bfcbd9"
        active-text-color="#409eff"
      >
        <el-menu-item
          v-for="item in menuItems"
          :key="item.path"
          :index="item.path"
        >
          <el-icon>
            <component :is="item.icon" />
          </el-icon>
          <template #title>{{ item.title }}</template>
        </el-menu-item>
      </el-menu>
    </div>
    
    <!-- 主内容区 -->
    <div class="main-container">
      <!-- 顶部导航 -->
      <div class="header">
        <div class="header-left">
          <el-icon
            class="collapse-btn"
            @click="isCollapsed = !isCollapsed"
          >
            <Fold v-if="!isCollapsed" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        
        <div class="header-right">
          <div class="socket-status">
            <el-tag :type="socketStore.connected ? 'success' : 'danger'" size="small">
              {{ socketStore.connected ? '已连接' : '未连接' }}
            </el-tag>
          </div>
          
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" icon="UserFilled" />
              <span class="username">{{ authStore.user?.name || '收银员' }}</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile">个人信息</el-dropdown-item>
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      
      <!-- 内容区 -->
      <div class="content">
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSocketStore } from '@/stores/socket'
import { useMachineStore } from '@/stores/machine'
import { useFaultStore } from '@/stores/fault'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const socketStore = useSocketStore()
const machineStore = useMachineStore()
const faultStore = useFaultStore()

const isCollapsed = ref(false)

const menuItems = [
  { path: '/dashboard', title: '数据大盘', icon: 'DataBoard' },
  { path: '/seats', title: '座位管理', icon: 'Grid' },
  { path: '/faults', title: '故障管理', icon: 'Warning' },
  { path: '/billing', title: '计费管理', icon: 'Money' },
  { path: '/users', title: '用户管理', icon: 'User' },
  { path: '/cleaning', title: '保洁管理', icon: 'Brush' },
  { path: '/shifts', title: '交接班', icon: 'Switch' },
  { path: '/bounty', title: '悬赏任务', icon: 'Trophy' },
  { path: '/reports', title: '数据报表', icon: 'DataAnalysis' },
  { path: '/settings', title: '系统设置', icon: 'Setting' },
]

const currentRoute = computed(() => route.path)
const currentTitle = computed(() => {
  const item = menuItems.find(m => m.path === route.path)
  return item?.title || ''
})

const handleCommand = async (command: string) => {
  if (command === 'logout') {
    await authStore.logout()
    router.push('/login')
  }
}

onMounted(async () => {
  // 连接WebSocket
  socketStore.connect()
  
  // 加载初始数据
  await Promise.all([
    authStore.getProfile(),
    machineStore.fetchAreas(),
    machineStore.fetchMachines(),
    faultStore.fetchTickets(),
  ])
})

onUnmounted(() => {
  socketStore.disconnect()
})
</script>

<style scoped lang="scss">
.layout-container {
  height: 100vh;
  display: flex;
}

.sidebar {
  width: 220px;
  background: #304156;
  transition: width 0.3s;
  
  &.collapsed {
    width: 64px;
  }
  
  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    font-weight: bold;
    color: #fff;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }
  
  .el-menu {
    border-right: none;
  }
}

.main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.header {
  height: 60px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  
  .header-left {
    display: flex;
    align-items: center;
    gap: 16px;
    
    .collapse-btn {
      font-size: 20px;
      cursor: pointer;
      color: #606266;
      
      &:hover {
        color: #409eff;
      }
    }
  }
  
  .header-right {
    display: flex;
    align-items: center;
    gap: 16px;
    
    .user-info {
      display: flex;
      align-items: center;
      gap: 8px;
      cursor: pointer;
      
      .username {
        font-size: 14px;
        color: #606266;
      }
    }
  }
}

.content {
  flex: 1;
  padding: 20px;
  background: #f5f7fa;
  overflow-y: auto;
}
</style>
