<template>
  <div class="app-container">
    <div v-if="demoMode" class="demo-banner">本地仿真 · 余额为演示资金 · 不连接真实支付</div>
    <router-view />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()
const demoMode = ref(false)

onMounted(async () => {
  try { demoMode.value = (await api.get('/health')).mode === 'demo' } catch {}
  userStore.restoreSession()
})
</script>

<style>
.demo-banner { padding:8px 16px; color:#675d48; background:#e9e3d1; border-bottom:1px solid #d5ccb6; font-size:10px; text-align:center; line-height:1.7; letter-spacing:.5px; }

:root {
  --paper:#f4f0e6;
  --paper-light:#faf7ef;
  --paper-deep:#eae5d8;
  --ink:#292f29;
  --ink-soft:#555e52;
  --ink-muted:#77796b;
  --rule:#dcd6c8;
  --cinnabar:#a34738;
  --pine:#536953;
  --font-song:'Songti SC','STSong','SimSun','Noto Serif CJK SC',serif;
  --font-sans:-apple-system,BlinkMacSystemFont,'PingFang SC','Microsoft YaHei',sans-serif;
  --el-color-primary:#536953;
  --el-color-primary-light-3:#82947b;
  --el-color-primary-light-5:#a5b09b;
  --el-color-primary-light-7:#c7cebc;
  --el-color-primary-light-8:#d7dccd;
  --el-color-primary-light-9:#e9ecdf;
  --el-color-primary-dark-2:#3e533e;
  --el-border-radius-base:3px;
  --el-border-color:#dcd6c8;
  --el-text-color-primary:#292f29;
}
* { margin:0; padding:0; box-sizing:border-box; }
body { font-family:var(--font-sans); background:#dedbd1; min-height:100vh; color:var(--ink); -webkit-font-smoothing:antialiased; }
.app-container { max-width:480px; margin:0 auto; min-height:100vh; background:var(--paper); border-inline:1px solid #d1ccbe; }
::selection { background:#dbd4bf; color:#292f29; }
/* The service pages share the same paper, ink and pine palette. */
.app-container.app-container :is(.seats-page,.menu-container,.repair-container,.profile-container) { background:var(--paper); }
.app-container.app-container :is(.nav-header,.nav-bar) { background:var(--paper); border-bottom:1px solid var(--rule); box-shadow:none; }
.app-container.app-container :is(.nav-header h2,.nav-bar h3,.section-title) { font-family:var(--font-song); font-weight:500; letter-spacing:2px; }
.app-container.app-container :is(.seat-card,.menu-item,.repair-form,.user-card,.stats-card,.history-card,.fault-item,.bottom-stats,.cart-bar,.area-tabs,.legend) { background:var(--paper-light); border-color:var(--rule); box-shadow:none; border-radius:3px; }
.app-container.app-container :is(.back-btn,.refresh-btn,.seat-icon,.item-price,.stat-value,.action-hint) { color:var(--pine); }
.app-container.app-container .area-tabs button { border-radius:2px; }
.app-container.app-container .area-tabs button.active { background:var(--ink); color:var(--paper-light); border-color:var(--ink); }
.app-container.app-container .seat-card.offline { border-color:#8b9c7f; }
.app-container.app-container .seat-card.online { border-color:#7b8b94; }
.app-container.app-container .seat-card.fault { border-color:#ab6556; }
.app-container.app-container .seat-card.dirty,.app-container.app-container .seat-card.cleaning { border-color:#b29862; }
.app-container.app-container .fault-item.active { background:#e9ecdf; border-color:var(--pine); color:var(--pine); }
.app-container.app-container .login-container { background:var(--paper); }
.app-container.app-container .login-card { background:var(--paper-light); border:1px solid var(--rule); border-radius:3px; box-shadow:none; }
.app-container.app-container .login-header h2 { font-family:var(--font-song); font-weight:500; }
.app-container.app-container .el-button,.app-container.app-container .el-input__wrapper,.app-container.app-container .el-textarea__inner { border-radius:3px; }
</style>
