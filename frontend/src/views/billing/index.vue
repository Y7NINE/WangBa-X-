<template>
  <div class="billing-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>计费管理</span>
          <el-button type="primary" @click="handleRecharge">充值</el-button>
        </div>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="当前会话" name="sessions">
          <el-table :data="activeSessions" stripe>
            <el-table-column prop="id" label="会话ID" width="100" />
            <el-table-column prop="machineId" label="机器" width="80" />
            <el-table-column prop="userId" label="用户ID" width="80" />
            <el-table-column prop="startTime" label="开始时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.startTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="duration" label="时长(分)" width="100" />
            <el-table-column prop="amount" label="费用(元)" width="100" />
            <el-table-column prop="status" label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'">
                  {{ row.settlementRequestedAt ? '待结算（已停计费）' : row.status === 'active' ? '进行中' : '已暂停' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button-group>
                  <el-button v-if="!row.settlementRequestedAt" size="small" @click="handlePause(row as Session)">{{ row.status === 'paused' ? '恢复' : '暂停' }}</el-button>
                  <el-button size="small" type="danger" @click="handleEnd(row as Session)">{{ row.settlementRequestedAt ? '重试结算' : '结束' }}</el-button>
                </el-button-group>
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>

        <el-tab-pane label="交易记录" name="transactions">
          <el-table :data="transactions" stripe>
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="userId" label="用户ID" width="80" />
            <el-table-column prop="type" label="类型" width="80">
              <template #default="{ row }">
                <el-tag :type="row.type === 'recharge' ? 'success' : 'warning'">
                  {{ row.type === 'recharge' ? '充值' : row.type === 'refund' ? '退款' : '消费' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="100">
              <template #default="{ row }">
                <span :style="{ color: row.type === 'recharge' ? '#6e8566' : '#a65c4a' }">
                  {{ row.type === 'recharge' ? '+' : '-' }}¥{{ row.amount }}
                </span>
              </template>
            </el-table-column>
            <el-table-column prop="balanceAfter" label="余额" width="100" />
            <el-table-column prop="description" label="描述" />
            <el-table-column prop="createdAt" label="时间" width="180">
              <template #default="{ row }">
                {{ formatTime(row.createdAt) }}
              </template>
            </el-table-column>
          </el-table>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 充值弹窗 -->
    <el-dialog v-model="rechargeVisible" title="用户充值" width="400px">
      <el-alert v-if="pending || storageError" :title="storageError || '原充值结果待确认，请勿重复收款；点击下方按钮确认或安全重试。'" type="warning" :closable="false" />
      <el-form :model="rechargeForm" label-width="80px" :disabled="!!pending || recharging">
        <el-form-item label="用户ID">
          <el-input v-model="rechargeForm.userId" placeholder="请输入用户ID" />
        </el-form-item>
        <el-form-item label="充值金额">
          <el-input-number v-model="rechargeForm.amount" :min="1" :max="1000" />
        </el-form-item>
        <el-form-item label="支付方式">
          <el-radio-group v-model="rechargeForm.paymentMethod">
            <el-radio value="cash">现金</el-radio>
            <el-radio value="wechat">微信</el-radio>
            <el-radio value="alipay">支付宝</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeVisible = false">取消</el-button>
        <el-button type="primary" :loading="recharging" :disabled="!!storageError" @click="submitRecharge">{{ pending ? '确认结果 / 重试原充值' : '确认充值' }}</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { billingApi, Session, Transaction } from '@/api/billing'
import dayjs from 'dayjs'
import { useRecharge } from '@/composables/useRecharge'

const { pending, busy: recharging, storageError, restore, submit } = useRecharge()

const activeTab = ref('sessions')
const activeSessions = ref<Session[]>([])
const transactions = ref<Transaction[]>([])
const rechargeVisible = ref(false)

const rechargeForm = ref({
  userId: '',
  amount: 50,
  paymentMethod: 'cash',
})

const formatTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

const loadData = async () => {
  activeSessions.value = await billingApi.getActiveSessions()
  transactions.value = await billingApi.getTransactions()
}

const handleRecharge = () => {
  restore()
  rechargeForm.value = pending.value
    ? { ...pending.value, userId: String(pending.value.userId) }
    : { userId: '', amount: 50, paymentMethod: 'cash' }
  rechargeVisible.value = true
}

const submitRecharge = async () => {
  if (recharging.value) return
  if (!rechargeForm.value.userId) {
    ElMessage.warning('请输入用户ID')
    return
  }

  try {
    await submit({ userId: Number(rechargeForm.value.userId), amount: rechargeForm.value.amount,
      paymentMethod: rechargeForm.value.paymentMethod })
    ElMessage.success('充值成功')
    rechargeVisible.value = false
    void loadData().catch(() => ElMessage.warning('充值已确认，列表刷新失败，请稍后刷新'))
  } catch (error: any) {
    ElMessage.error(error.message || '充值结果尚未确认，请勿重复收款')
  }
}

const handlePause = async (session: Session) => {
  try {
    if (session.status === 'paused') await billingApi.resumeSession(session.id)
    else await billingApi.pauseSession(session.id)
    ElMessage.success(session.status === 'paused' ? '已恢复' : '已暂停')
    loadData()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const handleEnd = async (session: Session) => {
  try { await ElMessageBox.confirm('确认停止使用并结算？余额不足时将固定账单并停计费，补款后需重试结算，期间座位仍保留占用。', '确认', { type: 'warning' }) }
  catch { return }
  try {
    await billingApi.endSession(session.id)
    ElMessage.success('会话已结束')
    void loadData().catch(() => ElMessage.warning('结算已确认，列表刷新失败，请稍后刷新'))
  } catch (error: any) {
    ElMessage.error(error.response?.data?.message || error.message || '结算结果待确认，请刷新会话后重试')
    await loadData().catch(() => undefined)
  }
}

onMounted(() => {
  loadData()
})
</script>

<style scoped lang="scss">
.billing-container {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
}
</style>
