<template>
  <div class="orders-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>水吧订单</span>
          <div>
            <el-radio-group v-model="statusFilter" @change="loadOrders">
              <el-radio-button value="">全部</el-radio-button>
              <el-radio-button value="pending">待处理</el-radio-button>
              <el-radio-button value="preparing">制作中</el-radio-button>
              <el-radio-button value="delivering">配送中</el-radio-button>
              <el-radio-button value="completed">已完成</el-radio-button>
              <el-radio-button value="cancelled">已退款</el-radio-button>
            </el-radio-group>
            <el-button style="margin-left: 12px" @click="loadOrders">刷新</el-button>
          </div>
        </div>
      </template>

      <el-table :data="orders" v-loading="loading" stripe>
        <el-table-column prop="id" label="单号" width="70" />
        <el-table-column prop="machineId" label="座位" width="90">
          <template #default="{ row }">{{ row.machineId || '—' }}</template>
        </el-table-column>
        <el-table-column label="商品" min-width="220">
          <template #default="{ row }">
            <div v-for="it in orderApi.parseItems(row.items)" :key="it.itemId" class="item-line">
              {{ it.name }} × {{ it.qty }}
              <span class="price">¥{{ (it.price * it.qty).toFixed(2) }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="total" label="合计" width="90">
          <template #default="{ row }">
            <span class="total">¥{{ Number(row.total).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="120">
          <template #default="{ row }">{{ row.remark || '—' }}</template>
        </el-table-column>
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)">{{ statusName(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="下单时间" width="160">
          <template #default="{ row }">{{ formatTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              type="primary"
              size="small"
              @click="advance(row as Order, 'preparing')"
            >接单</el-button>
            <el-button
              v-else-if="row.status === 'preparing'"
              type="warning"
              size="small"
              @click="advance(row as Order, 'delivering')"
            >送出</el-button>
            <el-button
              v-else-if="row.status === 'delivering'"
              type="success"
              size="small"
              @click="advance(row as Order, 'completed')"
            >完成</el-button>
            <el-button
              v-if="row.status === 'pending' || row.status === 'preparing'"
              type="danger"
              size="small"
              plain
              @click="advance(row as Order, 'cancelled')"
            >取消</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-empty v-if="!loading && orders.length === 0" description="暂无订单" />
    </el-card>
  </div>
</template>

<script setup lang="ts">
import type { TagProps } from 'element-plus'
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orderApi, type Order } from '@/api/order'

const orders = ref<Order[]>([])
const loading = ref(false)
const statusFilter = ref('')
const updating = ref(false)

const statusType = (s: string) => {
  const map: Record<string, TagProps['type']> = {
    pending: 'warning',
    preparing: 'primary',
    delivering: 'info',
    completed: 'success',
    cancelled: 'info',
  }
  return map[s] || 'info'
}

const statusName = (s: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    preparing: '制作中',
    delivering: '配送中',
    completed: '已完成',
    cancelled: '已取消',
  }
  return map[s] || s
}

const formatTime = (t: string) => {
  if (!t) return '-'
  return new Date(t).toLocaleString('zh-CN', { hour12: false })
}

const loadOrders = async () => {
  loading.value = true
  try {
    const list = await orderApi.getOrders(statusFilter.value || undefined)
    orders.value = Array.isArray(list) ? list : []
  } catch (e: any) {
    ElMessage.error(e?.message || '加载订单失败')
  } finally {
    loading.value = false
  }
}

const advance = async (row: Order, status: string) => {
  if (updating.value) return
  try {
    if (status === 'cancelled') await ElMessageBox.confirm('取消后金额将退回顾客账户余额，确认取消？', '取消订单')
    updating.value = true
    await orderApi.updateOrderStatus(row.id, status)
    ElMessage.success(`订单 #${row.id} → ${statusName(status)}`)
    await loadOrders()
  } catch (e: any) {
    if (e !== 'cancel' && e !== 'close') ElMessage.error(e?.message || '更新失败')
  } finally { updating.value = false }
}

let timer: number | undefined
onMounted(() => { loadOrders(); timer = window.setInterval(loadOrders, 15000) })
onUnmounted(() => window.clearInterval(timer))
</script>

<style scoped lang="scss">
.orders-container {
  padding: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-line {
  font-size: 13px;
  line-height: 1.7;

  .price {
    color: #7c8071;
    margin-left: 8px;
  }
}

.total {
  color: #a48b55;
  font-weight: 600;
}
</style>
