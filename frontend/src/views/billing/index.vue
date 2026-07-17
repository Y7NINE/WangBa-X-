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
                  {{ row.status === 'active' ? '进行中' : '已暂停' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="150">
              <template #default="{ row }">
                <el-button-group>
                  <el-button size="small" @click="handlePause(row)">暂停</el-button>
                  <el-button size="small" type="danger" @click="handleEnd(row)">结束</el-button>
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
                  {{ row.type === 'recharge' ? '充值' : '消费' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="amount" label="金额" width="100">
              <template #default="{ row }">
                <span :style="{ color: row.type === 'recharge' ? '#67c23a' : '#f56c6c' }">
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
      <el-form :model="rechargeForm" label-width="80px">
        <el-form-item label="用户ID">
          <el-input v-model="rechargeForm.userId" placeholder="请输入用户ID" />
        </el-form-item>
        <el-form-item label="充值金额">
          <el-input-number v-model="rechargeForm.amount" :min="1" :max="1000" />
        </el-form-item>
        <el-form-item label="支付方式">
          <el-radio-group v-model="rechargeForm.paymentMethod">
            <el-radio label="cash">现金</el-radio>
            <el-radio label="wechat">微信</el-radio>
            <el-radio label="alipay">支付宝</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="rechargeVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRecharge">确认充值</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { billingApi, Session, Transaction } from '@/api/billing'
import dayjs from 'dayjs'

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
  rechargeForm.value = { userId: '', amount: 50, paymentMethod: 'cash' }
  rechargeVisible.value = true
}

const submitRecharge = async () => {
  if (!rechargeForm.value.userId) {
    ElMessage.warning('请输入用户ID')
    return
  }
  
  try {
    await billingApi.recharge(
      parseInt(rechargeForm.value.userId),
      rechargeForm.value.amount,
      rechargeForm.value.paymentMethod
    )
    ElMessage.success('充值成功')
    rechargeVisible.value = false
    loadData()
  } catch (error) {
    ElMessage.error('充值失败')
  }
}

const handlePause = async (session: Session) => {
  try {
    await billingApi.pauseSession(session.id)
    ElMessage.success('已暂停')
    loadData()
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const handleEnd = async (session: Session) => {
  try {
    await ElMessageBox.confirm('确认结束该会话？', '确认', { type: 'warning' })
    await billingApi.endSession(session.id)
    ElMessage.success('会话已结束')
    loadData()
  } catch (error) {
    // 取消操作
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
