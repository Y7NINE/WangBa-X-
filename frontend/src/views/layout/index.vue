<template>
  <div class="layout-container">
    <!-- 侧边栏 -->
    <div class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="logo">
        <span class="brand-seal">网</span><div v-if="!isCollapsed" class="brand-name">网吧 X<small>门 店 工 作 台</small></div>
      </div>

      <div v-if="!isCollapsed" class="nav-caption">门店经营 / 日常事务</div>
      <el-menu
        :default-active="currentRoute"
        :collapse="isCollapsed"
        :router="true"
        background-color="var(--paper-deep)"
        text-color="var(--ink-soft)"
        active-text-color="var(--ink)"
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
      <div class="sidebar-footer"><span class="footer-stamp">闲</span><span v-if="!isCollapsed">经营有序，来客自在。<small>WANGBA X · 门店服务</small></span></div>
    </div>

    <!-- 主内容区 -->
    <div class="main-container">
      <!-- 顶部导航 -->
      <div class="header">
        <div class="header-left">
          <button class="collapse-btn" :aria-label="isCollapsed ? '展开导航' : '收起导航'" :aria-expanded="!isCollapsed" @click="isCollapsed = !isCollapsed"><el-icon><Fold v-if="!isCollapsed" /><Expand v-else /></el-icon></button>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>

        <div class="header-right">
          <el-tag v-if="demoMode" type="warning" size="small">本地仿真 · 非真实资金</el-tag>
          <div class="socket-status">
            <el-tag :type="socketStore.connected ? 'success' : 'danger'" size="small">
              {{ socketStore.connected ? '已连接' : '未连接' }}
            </el-tag>
            <span v-if="socketStore.recovering" role="status">更新中…</span>
            <el-button v-else-if="socketStore.recoveryError" text type="warning" :title="socketStore.recoveryError" @click="socketStore.recover">重新同步</el-button>
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
        <section class="workspace-heading"><div class="heading-copy"><span class="heading-kicker">门店手记 / {{ String(menuItems.findIndex(item => item.path === route.path) + 1).padStart(2, '0') }}</span><h1>{{ currentTitle }}</h1><p>{{ pageDescriptions[route.path] || '把每一项门店事务，处理妥当。' }}</p></div><div class="heading-date"><span>{{ todayLabel }}</span><small>网吧 X · 日常经营</small></div></section>
        <router-view />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import api from '@/api'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useSocketStore } from '@/stores/socket'
import { useMachineStore } from '@/stores/machine'
import { useFaultStore } from '@/stores/fault'
import { menuForRole, canAccessPage } from '@/access'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const socketStore = useSocketStore()
const machineStore = useMachineStore()
const faultStore = useFaultStore()

const isCollapsed = ref(false)
const demoMode = ref(false)

const menuItems = computed(() => menuForRole(authStore.user?.role))

const todayLabel = new Intl.DateTimeFormat('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }).format(new Date())
const pageDescriptions: Record<string, string> = {
  '/dashboard': '一览今日营业、座位与服务动态。', '/seats': '每一席的位置与状态，清楚可见。', '/faults': '及时受理，认真修复，让这一局继续。', '/billing': '会话、消费与充值，每一笔都有依据。', '/users': '记得每一位来客，也照顾每一次相聚。', '/cleaning': '收拾一席整洁，迎接下一位来客。', '/shifts': '交清账目与待办，接好下一班。', '/orders': '一杯茶，一份小食，准时送到座位。', '/reports': '从真实记录，看清门店经营。', '/settings': '把门店规则设置妥当，让日常更顺畅。', '/bounty': '用合适的活动，连接同好。', '/wakeup': '按约提醒，照顾每一次停留。',
}

const currentRoute = computed(() => route.path)
const currentTitle = computed(() => {
  const item = menuItems.value.find(m => m.path === route.path)
  return item?.title || ''
})

const handleCommand = async (command: string) => {
  if (command === 'logout') {
    await authStore.logout()
    router.push('/login')
  }
}

onMounted(async () => {
  const mayReadFaults = canAccessPage(authStore.user?.role, '/faults')
  if (!mayReadFaults) faultStore.tickets = []
  try { demoMode.value = (await api.get('/health')).mode === 'demo' } catch {}
  // 连接WebSocket
  socketStore.connect()

  // 加载初始数据
  await Promise.allSettled([
    machineStore.fetchAreas(),
    machineStore.fetchMachines(),
    ...(mayReadFaults ? [faultStore.fetchTickets()] : []),
  ])
})

onUnmounted(() => {
  socketStore.disconnect()
})
</script>

<style scoped lang="scss">
.layout-container { display:flex;height:100vh;height:100dvh;background:var(--paper); }
.sidebar { width:228px;flex-shrink:0;display:flex;flex-direction:column;background:var(--paper-deep);border-right:1px solid var(--rule);transition:width .2s;overflow:hidden;
 &.collapsed { width:68px; .logo { padding-inline:14px; } .sidebar-footer { padding-inline:19px; } }
 .logo { height:102px;min-height:102px;display:flex;align-items:center;gap:14px;padding:22px 27px;border-bottom:1px solid var(--rule);color:var(--ink); }
 .brand-seal { display:grid;place-items:center;width:36px;height:42px;flex-shrink:0;border:1px solid var(--cinnabar);outline:1px solid var(--cinnabar);outline-offset:-5px;font:24px var(--font-song);color:var(--cinnabar);transform:rotate(-3deg); }
 .brand-name { font:25px var(--font-song);letter-spacing:3px;white-space:nowrap;small { display:block;font:9px var(--font-sans);letter-spacing:3px;color:var(--ink-muted);margin-top:8px; } }
 .nav-caption { padding:22px 27px 12px;font-size:10px;letter-spacing:2px;color:var(--ink-muted);white-space:nowrap; }
 .el-menu { border:0;flex:1;overflow-y:auto;overflow-x:hidden;background:transparent;scrollbar-width:thin; }
 .sidebar-footer { display:flex;align-items:center;gap:12px;padding:22px 25px;min-height:83px;border-top:1px solid var(--rule);color:var(--ink-soft);font:11px var(--font-song);white-space:nowrap;small { display:block;font:8px var(--font-sans);color:var(--ink-muted);letter-spacing:1px;margin-top:6px; } }
 .footer-stamp { display:grid;place-items:center;width:25px;height:28px;flex-shrink:0;border:1px solid var(--cinnabar);color:var(--cinnabar);font:18px var(--font-song);transform:rotate(-3deg); }
}
.main-container { flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden; }
.header { height:76px;min-height:76px;background:var(--paper-light);border-bottom:1px solid var(--rule);box-shadow:none;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:0 30px;
 .header-left,.header-right { display:flex;align-items:center;gap:17px; }
 .collapse-btn { display:grid;place-items:center;width:36px;height:44px;border:0;background:transparent;font-size:20px;cursor:pointer;color:var(--ink-soft); &:hover { color:var(--cinnabar); } }
 .user-info { display:flex;align-items:center;gap:9px;cursor:pointer;.username { font-size:12px;color:var(--ink-soft); } }
}
.content { flex:1;overflow:auto;padding:29px 30px 35px;background:var(--paper); }
.workspace-heading { display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:27px;padding-bottom:25px;border-bottom:1px solid var(--rule); }
.heading-kicker { font-size:9px;letter-spacing:3px;color:var(--ink-muted); }
h1 { font:500 29px var(--font-song);letter-spacing:4px;color:var(--ink);margin:9px 0; }
.heading-copy p { margin:0;font-size:12px;color:var(--ink-muted);letter-spacing:.5px; }
.heading-date { text-align:right;font-family:var(--font-song);font-size:12px;letter-spacing:1px;color:var(--ink-soft);small { display:block;font:9px var(--font-sans);letter-spacing:2px;color:var(--ink-muted);margin-top:10px; } }
@media(max-width:1000px) { .content { padding:22px 20px; }.header { padding-inline:20px; }.sidebar { width:194px; }.heading-date { display:none; }.sidebar .logo { padding-inline:20px; }.sidebar .brand-name { font-size:22px; } }
@media(max-width:760px) { .header { padding-inline:15px; }.header-right { gap:8px; }.header-right>.el-tag { display:none; }.content { padding:20px 14px; }.workspace-heading { margin-bottom:20px; }.sidebar { width:176px; }h1 { font-size:25px; } }
@media(prefers-reduced-motion:reduce) { .sidebar { transition:none; } }
</style>
