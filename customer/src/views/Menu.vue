<template>
  <div class="menu-container">
    <div class="nav-bar"><el-button text @click="$router.push('/')"><el-icon><ArrowLeft /></el-icon> 返回</el-button><h3>茶饮与小食</h3><el-button text @click="loadOrders">刷新</el-button></div>
    <p class="service-note">{{ userStore.currentSession ? `配送座位 ${userStore.currentSession.machineId} · 从账户余额扣款` : '先选座上机，即可点单送到座位。' }}</p>
    <p v-if="loadError" class="service-note" role="alert">{{ loadError }} <el-button text @click="loadMenu">重试</el-button></p>
    <p v-else-if="loading" class="service-note" role="status">正在准备菜单…</p>
    <div class="menu-list"><div v-for="item in menuItems" :key="item.id" class="menu-item"><div class="item-image"><el-icon :size="28"><Coffee /></el-icon></div><div class="item-info"><div class="item-name">{{ item.name }}</div><div class="item-desc">{{ item.description }}</div><div class="item-price">¥{{ item.price }}</div></div><div class="quantity-controls"><button v-if="quantity(item.id)" :aria-label="`减少${item.name}`" @click="removeFromCart(item.id)">−</button><span v-if="quantity(item.id)">{{ quantity(item.id) }}</span><button :aria-label="`添加${item.name}`" :disabled="submitting || quantity(item.id) >= 20" @click="addToCart(item)">＋</button></div></div></div>
    <section class="order-history"><header><h3>我的点单</h3><small>共 {{ orders.length }} 单</small></header><p v-if="!userStore.isLoggedIn" class="service-note">登录后查看点单记录。</p><p v-else-if="!orders.length" class="service-note">还没有订单，选一杯喜欢的吧。</p><article v-for="order in orders" :key="order.id" class="order-row"><header><strong>#{{ order.id }} · {{ order.machineId }}</strong><span>{{ statusNames[order.status] || order.status }}</span></header><p>{{ orderSummary(order.items) }}</p><small>¥{{ Number(order.total).toFixed(2) }} · {{ new Date(order.createdAt).toLocaleString('zh-CN', { hour12: false }) }}</small></article></section>
    <div v-if="cart.length > 0" class="cart-bar"><div class="cart-info"><span>共 {{ cartCount }} 件</span><span class="cart-total">¥{{ cartTotal.toFixed(2) }}</span></div><el-button type="primary" :loading="submitting" :disabled="!userStore.currentSession" @click="submitOrder">余额支付下单</el-button></div>
  </div>
</template>
<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import api from '@/api'
import { orderApi, type Order } from '@/api/order'
const userStore = useUserStore()
interface MenuItem { id: number; name: string; description: string; price: number }
interface CartItem extends MenuItem { quantity: number }
const menuItems = ref<MenuItem[]>([])
const cart = ref<CartItem[]>([])
const orders = ref<Order[]>([])
const loading = ref(false)
const loadError = ref('')
const submitting = ref(false)
const statusNames: Record<string, string> = { pending: '待接单', preparing: '制作中', delivering: '配送中', completed: '已送达', cancelled: '已取消并退回余额' }
const cartCount = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0))
const cartTotal = computed(() => cart.value.reduce((sum, item) => sum + item.price * item.quantity, 0))
const quantity = (id: number) => cart.value.find(item => item.id === id)?.quantity || 0
const addToCart = (item: MenuItem) => { const existing = cart.value.find(row => row.id === item.id); if (existing) existing.quantity++; else cart.value.push({ ...item, quantity: 1 }) }
const removeFromCart = (id: number) => { const item = cart.value.find(item => item.id === id); if (item && !submitting.value) { item.quantity--; cart.value = cart.value.filter(item => item.quantity > 0) } }
const orderSummary = (items: string) => { try { return JSON.parse(items).map((item: any) => `${item.name} × ${item.qty}`).join('、') } catch { return '商品明细暂不可用' } }
async function loadMenu() { loading.value = true; loadError.value = ''; try { menuItems.value = await api.get('/menu') } catch (error: any) { loadError.value = error.message } finally { loading.value = false } }
async function loadOrders() { if (!userStore.isLoggedIn) return; try { orders.value = await orderApi.getOrders() } catch (error: any) { ElMessage.error(error.message) } }
async function submitOrder() {
  if (submitting.value || !cart.value.length) return
  if (!userStore.currentSession) { ElMessage.warning('请先选座上机'); return }
  submitting.value = true
  try {
    const order = await orderApi.createOrder({ userId: userStore.user!.id, machineId: userStore.currentSession.machineId, items: cart.value.map(item => ({ itemId: item.id, name: item.name, price: item.price, qty: item.quantity })), total: cartTotal.value })
    cart.value = []
    await Promise.all([loadOrders(), userStore.refreshProfile()])
    ElMessage.success(`订单 #${order.id} 已提交，请在下方查看配送进度`)
  } catch (error: any) { ElMessage.error(error.message || '下单失败') } finally { submitting.value = false }
}
let timer: number | undefined
onMounted(() => { loadMenu(); loadOrders(); timer = window.setInterval(loadOrders, 15000) })
onUnmounted(() => window.clearInterval(timer))
</script>
<style scoped lang="scss">
.service-note { font-size:12px; line-height:1.8; color:var(--ink-soft); margin-bottom:20px; }
.quantity-controls { display:flex; align-items:center; gap:8px; }
.quantity-controls button { width:32px; height:36px; border:1px solid var(--rule); border-radius:2px; background:var(--paper); color:var(--ink); cursor:pointer; }
.quantity-controls button:disabled { opacity:.4; cursor:not-allowed; }
.order-history { margin-top:30px; padding-top:20px; border-top:1px solid var(--rule); }
.order-history header { display:flex; justify-content:space-between; align-items:center; gap:10px; margin-bottom:14px; }
.order-history h3 { font-family:var(--font-song); font-weight:500; font-size:20px; }
.order-history small { font-size:10px; color:var(--ink-muted); }
.order-row { padding:16px 0; border-bottom:1px solid var(--rule); }
.order-row header { font-size:12px; }.order-row strong { font-weight:500; }.order-row header span { color:var(--pine); font-size:11px; }.order-row p { font-size:12px; color:var(--ink-soft); margin:10px 0; }

.menu-container {
  padding: 16px;
  max-width: 768px;
  margin: 0 auto;
  padding-bottom: 80px;
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

.menu-list {
  .menu-item {
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;

    .item-image {
      width: 60px;
      height: 60px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #a34738;
    }

    .item-info {
      flex: 1;

      .item-name {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 4px;
      }

      .item-desc {
        font-size: 12px;
        color: #77796b;
        margin-bottom: 4px;
      }

      .item-price {
        font-size: 16px;
        color: #a34738;
        font-weight: bold;
      }
    }
  }
}

.cart-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--paper-light);
  max-width:480px;
  margin:0 auto;
  z-index:20;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);

  .cart-info {
    display: flex;
    align-items: center;
    gap: 16px;

    .cart-total {
      font-size: 20px;
      font-weight: bold;
      color: #a34738;
    }
  }
}
</style>
