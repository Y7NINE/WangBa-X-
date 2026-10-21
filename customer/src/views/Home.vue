<template>
  <main class="lounge">
    <header class="masthead">
      <router-link to="/" class="brand" aria-label="网吧X 首页"><span class="brand-seal">网</span><span>网吧<span class="brand-x"> X</span><small>电竞 · 茶饮 · 相聚</small></span></router-link>
      <button class="account-link" @click="router.push(userStore.isLoggedIn ? '/profile' : '/login')">{{ userStore.user?.nickname || '登录 / 注册' }} <span aria-hidden="true">↗</span></button>
    </header>

    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy"><p class="edition">闲来一局 · 尽兴而归</p><h1 id="hero-title">此间，<br>正好有位。</h1><p class="hero-note">约上老友，或独享片刻。<br>选个好位置，开始今天这一局。</p><button class="primary" @click="router.push('/seats')">选座上机 <span aria-hidden="true">→</span></button></div>
      <svg class="ink-landscape" viewBox="0 0 440 450" fill="none" aria-hidden="true">
        <defs><linearGradient id="ink-fade" x1="270" y1="80" x2="240" y2="400" gradientUnits="userSpaceOnUse"><stop stop-color="#424d45" stop-opacity=".4"/><stop offset="1" stop-color="#9ca397" stop-opacity=".02"/></linearGradient><linearGradient id="ink-near" x1="350" y1="175" x2="220" y2="420" gradientUnits="userSpaceOnUse"><stop stop-color="#34423a" stop-opacity=".65"/><stop offset="1" stop-color="#6a7769" stop-opacity=".04"/></linearGradient><filter id="ink-soft"><feGaussianBlur stdDeviation="2.4"/></filter></defs>
        <circle cx="333" cy="81" r="27" fill="#a64b3d" opacity=".72"/>
        <g filter="url(#ink-soft)"><path d="M85 313 132 226 160 240 202 153 230 192 271 102 310 163 343 140 440 279V420H85Z" fill="url(#ink-fade)"/><path d="m142 420 58-119 31 19 59-136 28 43 29-21 93 112v102Z" fill="url(#ink-near)"/></g>
        <path d="m250 292 40-108 28 43 29-21 35 44" stroke="#536152" stroke-opacity=".34" stroke-width="1.5"/><path d="m263 274 27-90 5 65m21-20 13 44m14-63 12 56" stroke="#68715d" stroke-opacity=".2" stroke-width="3"/>
        <path d="M109 352c83-15 145-17 251-5M76 374c87-14 148-15 244-9m-179 30c71-8 118-7 173-3" stroke="#718077" stroke-opacity=".16"/>
        <path d="m320 348 19-3 14 4-23 2Z" fill="#434b40" opacity=".6"/><path d="m335 345 2-10 2 10" stroke="#434b40" stroke-opacity=".65"/>
        <path d="m405 360-3-58m2 24-15-17m14 8 13-19m-14 11-10-18m10 35 19-12" stroke="#38463b" stroke-opacity=".48" stroke-width="2"/><g fill="#38463b" opacity=".4"><ellipse cx="389" cy="307" rx="11" ry="3" transform="rotate(30 389 307)"/><ellipse cx="416" cy="297" rx="13" ry="3" transform="rotate(-30 416 297)"/><ellipse cx="391" cy="290" rx="10" ry="3" transform="rotate(40 391 290)"/><ellipse cx="420" cy="313" rx="12" ry="3" transform="rotate(-24 420 313)"/></g>
        <path d="m230 100 6-3 7 2m-21 16 5-2 5 1" stroke="#596052" stroke-opacity=".5" stroke-linecap="round"/>
      </svg>
      <span class="margin-note" aria-hidden="true">山水有闲 · 同游有伴</span>
    </section>
    <div class="store-status" role="status"><span class="status-label"><i :class="{ unavailable: loadError }"></i>{{ loading ? '正在更新座位' : loadError ? '门店数据暂不可用' : '门店座位' }}</span><span v-if="!loadError && !loading">空闲 <strong>{{ availableCount }}</strong> 席 <span class="status-divider">/</span> 上机 {{ onlineCount }} 人</span><button v-else-if="loadError" class="text-button" @click="loadData">重试</button></div>

    <section v-if="userStore.currentSession" class="session panel">
      <header class="section-heading"><div><span class="section-kicker">{{ userStore.currentSession.settlementRequestedAt ? '待结算（已停计费）' : userStore.currentSession.status === 'paused' ? '已暂停' : '正在上机' }}</span><h2>你的这一局</h2></div><span class="session-seat">{{ userStore.currentSession.machineId }}</span></header>
      <div class="metrics"><div><small>已用时长</small><strong>{{ formatDuration(userStore.currentSession.duration) }}</strong></div><div><small>当前费用</small><strong>¥{{ Number(userStore.currentSession.amount || 0).toFixed(2) }}</strong></div></div>
      <div class="session-actions"><button @click="router.push('/repair')">设备报修</button><button class="primary" @click="handleEndSession">{{ userStore.currentSession.settlementRequestedAt ? '补款后重试结算' : '下机结算' }}</button></div>
    </section>

    <nav class="services" aria-label="门店服务">
      <button @click="router.push('/seats')"><svg viewBox="0 0 32 32" aria-hidden="true"><rect x="5" y="5" width="22" height="15" rx="1"/><path d="M16 20v6m-6 0h12M9 10h14"/></svg><strong>选座</strong><small>找个好位置</small></button>
      <button @click="router.push('/menu')"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M7 12h15v9a5 5 0 0 1-5 5h-5a5 5 0 0 1-5-5ZM22 14h2a4 4 0 0 1 0 8h-2M5 29h22M11 4v4m7-5v5"/></svg><strong>茶饮</strong><small>送到座位边</small></button>
      <button @click="router.push('/repair')"><svg viewBox="0 0 32 32" aria-hidden="true"><path d="m20 5-4 4 7 7 4-4a8 8 0 0 1-10 10l-6 6a3 3 0 0 1-4-4l6-6A8 8 0 0 1 20 5Z"/></svg><strong>报修</strong><small>有事随时说</small></button>
      <button @click="router.push('/profile')"><svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="10" r="5"/><path d="M6 27a10 10 0 0 1 20 0M11 27h10"/></svg><strong>我的</strong><small>账户与记录</small></button>
    </nav>

    <section class="seat-section" aria-labelledby="seats-title">
      <header class="section-heading"><div><span class="section-kicker">择席而坐</span><h2 id="seats-title">今日空位</h2></div><button class="text-button" :disabled="loading" @click="loadData">{{ loading ? '更新中' : '刷新座位 ↻' }}</button></header>
      <p v-if="loadError" role="alert" class="notice">{{ loadError }} <button class="text-button" @click="loadData">重新加载</button></p><p v-else-if="loading" class="empty-state">正在为你查看空位…</p>
      <template v-else>
        <div class="preferences"><label>预计时长 <select v-model.number="hours"><option :value="1">1 小时</option><option :value="2">2 小时</option><option :value="3">3 小时</option><option :value="5">5 小时</option></select></label><label class="available-toggle"><input v-model="onlyAvailable" type="checkbox"> 只看有位</label></div>
        <div class="area-list"><article v-for="(area, index) in visibleAreas" :key="area.id" class="area"><span class="area-index" aria-hidden="true">{{ String(index + 1).padStart(2, '0') }}</span><div class="area-content"><header class="section-heading"><h3>{{ area.name }}</h3><span class="availability" :class="{ full: !freeInArea(area.id) }">{{ freeInArea(area.id) ? `余 ${freeInArea(area.id)} 席` : '暂满' }}</span></header><div class="price">¥{{ Number(area.pricePerHour).toFixed(2) }}<small> / 小时</small></div><p class="estimate">{{ hours }} 小时基础网费约 <strong>¥{{ (Number(area.pricePerHour) * hours).toFixed(2) }}</strong></p></div><button class="area-action" :disabled="!freeInArea(area.id)" :aria-label="`查看${area.name}座位`" @click="router.push({ path: '/seats', query: { area: area.id } })"><span>选座</span><span aria-hidden="true">↗</span></button></article></div>
        <p v-if="!visibleAreas.length" class="empty-state">{{ onlyAvailable ? '暂无空闲区域，取消筛选可查看全部座位。' : '门店尚未配置区域，请联系前台。' }}</p>
        <p class="footnote">以上为小时单价试算，不含餐饮、会员优惠及包时规则，按开始分钟计费，不足1分钟按1分钟计；实际费用以结算账单为准。座位实时变化，查看不代表锁定。</p>
      </template>
    </section>
    <footer class="page-footer"><span class="footer-seal" aria-hidden="true">闲</span><p>尽兴一局，来日再聚。<small>网吧 X · 顾客服务</small></p><a href="#hero-title" aria-label="返回顶部">↑</a></footer>
  </main>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { machineApi, type Machine, type Area } from '@/api/machine'
import { type Socket } from 'socket.io-client'
import { connectCustomerSocket } from '@/utils/realtime'

const router = useRouter()
const userStore = useUserStore()
const machines = ref<Machine[]>([])
const areas = ref<Area[]>([])
const loading = ref(false)
const loadError = ref('')
const hours = ref(3)
const onlyAvailable = ref(false)
const freeInArea = (id: number) => machines.value.filter(m => m.areaId === id && m.status === 'offline').length
const visibleAreas = computed(() => areas.value.filter(a => !onlyAvailable.value || freeInArea(a.id) > 0))
let socket: Socket | null = null

const onlineCount = computed(() => machines.value.filter(m => m.status === 'online').length)
const availableCount = computed(() => machines.value.filter(m => m.status === 'offline').length)

const formatDuration = (min: number) => {
  const h = Math.floor(min / 60)
  const m = min % 60
  return h > 0 ? `${h}小时${m}分` : `${m}分钟`
}

const handleEndSession = async () => {
  if (!userStore.currentSession) return
  try {
    await ElMessageBox.confirm('确定停止使用并结算？余额不足时账单固定并停止计费，请到前台补款后重试结算，期间座位仍保留占用。', '确认')
    const r = await userStore.endCurrentSession()
    ElMessage.success(`结算 ¥${r?.amount ?? 0}`)
    loadData()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '结算失败')
  }
}

const loadData = async () => {
  if (loading.value) return
  loading.value = true
  loadError.value = ''
  try {
    const [machineList, areaList] = await Promise.all([machineApi.getMachines(), machineApi.getAreas()])
    machines.value = machineList
    areas.value = areaList
  } catch { loadError.value = '门店数据加载失败，请重试或联系前台。' }
  finally { loading.value = false }
}

const connectSocket = () => {
  socket?.disconnect()
  socket = connectCustomerSocket(loadData, (d) => {
    const m = machines.value.find(m => m.id === d.machine_id)
    if (m) m.status = d.status
  }, () => userStore.token)
}
watch(() => userStore.token, connectSocket, { flush: 'sync' })

let sessionTimer: number | null = null

onMounted(() => {
  loadData()
  connectSocket()
  // 每 30 秒刷新一次进行中会话的时长/金额
  sessionTimer = window.setInterval(() => {
    loadData()
    if (userStore.currentSession) {
      userStore.loadCurrentSession()
    }
  }, 30_000)
})
onUnmounted(() => { socket?.disconnect(); if (sessionTimer) clearInterval(sessionTimer) })
</script>
<style scoped>
.lounge { min-height:100vh; padding:0 28px; color:var(--ink); background:var(--paper); }
.masthead { display:flex; justify-content:space-between; align-items:center; padding:27px 0 23px; border-bottom:1px solid var(--rule); }
.brand { display:flex; align-items:center; gap:11px; color:var(--ink); text-decoration:none; font-family:var(--font-song); font-size:24px; font-weight:700; letter-spacing:2px; }
.brand-seal { display:grid; place-items:center; width:39px; height:43px; border:1.5px solid var(--cinnabar); outline:1px solid var(--cinnabar); outline-offset:-5px; color:var(--cinnabar); font-size:24px; transform:rotate(-3deg); }
.brand-x { font-family:Georgia,serif; font-size:20px; font-weight:400; }
.brand small { display:block; margin-top:5px; font-family:var(--font-sans); font-size:9px; font-weight:400; letter-spacing:2px; color:var(--ink-muted); }
button { min-height:44px; border:1px solid var(--rule); padding:10px 17px; border-radius:2px; background:transparent; color:var(--ink); font:inherit; font-size:13px; cursor:pointer; transition:background .18s,color .18s; }
button:hover { background:var(--paper-deep); } button:disabled { opacity:.45; cursor:not-allowed; }
button:focus-visible,a:focus-visible,select:focus-visible,input:focus-visible { outline:2px solid var(--cinnabar); outline-offset:4px; }
.account-link { border:0; padding:8px 0 8px 8px; font-size:12px; color:var(--ink-soft); }.account-link span { margin-left:6px; }
.hero { position:relative; min-height:365px; padding:29px 0 30px; isolation:isolate; }
.hero-copy { position:relative; z-index:2; width:75%; pointer-events:none; }.hero-copy button { pointer-events:auto; }
.edition { font-size:10px; letter-spacing:3px; color:var(--ink-muted); margin-bottom:22px; }
h1 { font-family:var(--font-song); font-size:48px; font-weight:500; line-height:1.38; letter-spacing:5px; }
.hero-note { font-size:12px; line-height:2; color:var(--ink-soft); margin:17px 0 22px; }
.primary { background:var(--ink); color:var(--paper); border-color:var(--ink); }.primary:hover { background:#414a40; }.hero .primary { min-width:139px; text-align:left; }.hero .primary span { float:right; margin-left:25px; }
.ink-landscape { position:absolute; z-index:0; width:100%; height:100%; right:-28px; bottom:0; pointer-events:none; }
.margin-note { position:absolute; right:1px; top:41px; writing-mode:vertical-rl; letter-spacing:5px; font-family:var(--font-song); font-size:11px; color:var(--ink-muted); }
.store-status { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; min-height:53px; border-block:1px solid var(--rule); font-size:11px; color:var(--ink-soft); }.status-label { display:flex; align-items:center; gap:8px; }.status-label i { width:5px; height:5px; border-radius:50%; background:var(--pine); }.status-label i.unavailable { background:var(--cinnabar); }.store-status strong { font-family:Georgia,serif; font-size:21px; color:var(--ink); font-weight:400; margin:0 3px; }.status-divider { color:#b9b4a6; margin:0 8px; }
.services { display:grid; grid-template-columns:repeat(4,1fr); padding:25px 0; border-bottom:1px solid var(--rule); }.services button { border:0; padding:4px 0 6px; min-width:0; }.services button+button { border-left:1px solid var(--rule); }.services svg { display:block; width:25px; height:25px; margin:0 auto 12px; fill:none; stroke:var(--ink); stroke-width:1.3; stroke-linecap:round; stroke-linejoin:round; }.services strong { display:block; font-weight:500; font-size:13px; letter-spacing:3px; }.services small { display:block; margin-top:6px; font-size:9px; color:var(--ink-muted); }
.panel { margin-top:23px; padding:20px; background:var(--paper-light); border:1px solid var(--rule); }.section-heading { display:flex; align-items:center; justify-content:space-between; gap:12px; }.section-kicker { font-size:10px; letter-spacing:3px; color:var(--ink-muted); }h2 { font-family:var(--font-song); font-size:24px; font-weight:500; letter-spacing:2px; margin-top:7px; }.session-seat { font-family:Georgia,serif; font-size:24px; color:var(--cinnabar); }.metrics { display:flex; gap:40px; padding:23px 0; }.metrics small { display:block; color:var(--ink-muted); font-size:11px; margin-bottom:8px; }.metrics strong { font-weight:500; font-size:20px; }.session-actions { display:flex; justify-content:space-between; gap:12px; }
.seat-section { padding-top:30px; }.text-button { border:0; padding:9px 0 9px 10px; color:var(--ink-soft); font-size:11px; }.preferences { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; padding:20px 0; font-size:11px; color:var(--ink-soft); }.preferences select { appearance:auto; margin-left:6px; border:0; border-bottom:1px solid var(--rule); color:var(--ink); background:transparent; padding:8px 4px; font:inherit; min-height:36px; }.available-toggle { display:flex; align-items:center; gap:6px; min-height:36px; }.available-toggle input { accent-color:var(--pine); width:14px; height:14px; }
.area { display:flex; gap:15px; padding:22px 0; border-top:1px solid var(--rule); align-items:center; }.area-index { align-self:flex-start; font-family:Georgia,serif; font-size:13px; color:#969383; padding-top:3px; }.area-content { flex:1; min-width:0; }h3 { font-family:var(--font-song); font-size:19px; font-weight:500; letter-spacing:1px; }.availability { color:var(--pine); font-size:10px; white-space:nowrap; }.availability.full { color:var(--ink-muted); }.price { font-family:Georgia,serif; font-size:29px; margin:11px 0 8px; font-variant-numeric:tabular-nums; }.price small { font-family:var(--font-sans); font-size:10px; color:var(--ink-muted); }.estimate { font-size:10px; color:var(--ink-muted); line-height:1.6; }.estimate strong { font-weight:400; color:var(--ink-soft); }.area-action { display:flex; flex-direction:column; justify-content:space-between; align-items:center; gap:14px; align-self:stretch; min-width:48px; padding:11px 10px; font-size:11px; border-color:#cbc5b6; }.area-action:hover { color:var(--cinnabar); border-color:var(--cinnabar); }.area-action span:last-child { font-size:17px; }
.footnote { padding-top:16px; border-top:1px solid var(--rule); font-size:10px; color:var(--ink-muted); line-height:1.9; }.empty-state { font-size:12px; color:var(--ink-muted); padding:28px 0; line-height:1.8; }.notice { margin-top:20px; padding:16px; border-left:2px solid var(--cinnabar); background:var(--paper-deep); color:var(--ink-soft); font-size:12px; line-height:1.8; }
.page-footer { display:flex; align-items:center; gap:12px; padding:34px 0 27px; margin-top:25px; border-top:1px solid var(--rule); }.footer-seal { display:grid; place-items:center; width:27px; height:30px; border:1px solid var(--cinnabar); color:var(--cinnabar); font-family:var(--font-song); font-size:18px; transform:rotate(-4deg); }.page-footer p { font-family:var(--font-song); font-size:13px; letter-spacing:1px; color:var(--ink-soft); }.page-footer small { display:block; font-family:var(--font-sans); font-size:9px; color:var(--ink-muted); margin-top:6px; letter-spacing:1px; }.page-footer a { margin-left:auto; display:grid; place-items:center; width:44px; height:44px; color:var(--ink-soft); text-decoration:none; border:1px solid var(--rule); }
@media(max-width:360px) { .lounge { padding:0 20px; }h1 { font-size:42px; }.hero { min-height:350px; }.margin-note { right:-3px; }.ink-landscape { right:-20px; }.area { gap:10px; }.area-action { min-width:40px; padding-inline:7px; }.services small { font-size:8px; }.brand { font-size:21px; }.account-link { font-size:11px; } }
@media(prefers-reduced-motion:reduce) { button { transition:none; } }
</style>
