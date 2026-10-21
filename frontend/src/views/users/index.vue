<template>
  <div class="users-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>用户管理</span>
          <el-input
            v-model="searchKey"
            placeholder="搜索用户"
            style="width: 200px"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
      </template>

      <el-table :data="filteredUsers" stripe>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="nickname" label="昵称" width="120" />
        <el-table-column prop="phone" label="手机号" width="120" />
        <el-table-column prop="balance" label="余额" width="100">
          <template #default="{ row }">
            <span class="balance">¥{{ row.balance }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="credits" label="积分" width="100" />
        <el-table-column prop="memberLevel" label="会员等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.memberLevel)">
              {{ getLevelName(row.memberLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="totalSpent" label="累计消费" width="100">
          <template #default="{ row }">
            ¥{{ row.totalSpent }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" width="180" />
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" @click="handleDetail(row as User)">详情</el-button>
              <el-button size="small" type="warning" @click="handleRecharge(row as User)">充值</el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 用户详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="用户详情"
      width="600px"
    >
      <div v-if="currentUser" class="user-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="用户ID">{{ currentUser.id }}</el-descriptions-item>
          <el-descriptions-item label="昵称">{{ currentUser.nickname }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ currentUser.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="会员等级">
            <el-tag :type="getLevelType(currentUser.memberLevel)">
              {{ getLevelName(currentUser.memberLevel) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="账户余额">
            <span class="balance">¥{{ currentUser.balance }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="积分">{{ currentUser.credits }}</el-descriptions-item>
          <el-descriptions-item label="累计消费">¥{{ currentUser.totalSpent }}</el-descriptions-item>
          <el-descriptions-item label="注册时间">{{ currentUser.createdAt }}</el-descriptions-item>
        </el-descriptions>

        <div class="detail-actions">
          <el-button type="primary" @click="handleRecharge(currentUser)">
            <el-icon><Wallet /></el-icon> 充值
          </el-button>
          <el-button @click="detailVisible = false">关闭</el-button>
        </div>
      </div>
    </el-dialog>

    <!-- 充值弹窗 -->
    <el-dialog
      v-model="rechargeVisible"
      title="用户充值"
      width="450px"
    >
      <el-alert v-if="pending || storageError" :title="storageError || '原充值结果待确认，请勿重复收款；点击下方按钮确认或安全重试。'" type="warning" :closable="false" />
      <div v-if="currentUser" class="recharge-form">
        <div class="user-info">
          <el-avatar :size="48" icon="User" />
          <div class="user-name">
            <div class="name">{{ currentUser.nickname }}</div>
            <div class="balance">当前余额: ¥{{ currentUser.balance }}</div>
          </div>
        </div>

        <el-form :model="rechargeForm" label-width="80px" :disabled="!!pending || recharging">
          <el-form-item label="充值金额">
            <el-input-number
              v-model="rechargeForm.amount"
              :min="1"
              :max="10000"
              :step="10"
              style="width: 100%"
            />
          </el-form-item>

          <el-form-item label="快捷金额">
            <el-button-group>
              <el-button @click="rechargeForm.amount = 50">50</el-button>
              <el-button @click="rechargeForm.amount = 100">100</el-button>
              <el-button @click="rechargeForm.amount = 200">200</el-button>
              <el-button @click="rechargeForm.amount = 500">500</el-button>
            </el-button-group>
          </el-form-item>

          <el-form-item label="支付方式">
            <el-radio-group v-model="rechargeForm.paymentMethod">
              <el-radio value="cash">现金</el-radio>
              <el-radio value="wechat">微信</el-radio>
              <el-radio value="alipay">支付宝</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="备注">
            <el-input
              v-model="rechargeForm.remark"
              type="textarea"
              placeholder="可选"
            />
          </el-form-item>
        </el-form>

        <div class="recharge-summary">
          <div class="summary-item">
            <span>充值金额</span>
            <span class="amount">¥{{ rechargeForm.amount }}</span>
          </div>
          <div class="summary-item">
            <span>充值后余额</span>
            <span class="amount">¥{{ (currentUser.balance + rechargeForm.amount).toFixed(2) }}</span>
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="rechargeVisible = false">取消</el-button>
        <el-button type="primary" @click="submitRecharge" :loading="recharging" :disabled="!!storageError">
          {{ pending ? '确认结果 / 重试原充值' : '确认充值' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import type { TagProps } from 'element-plus'
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Wallet } from '@element-plus/icons-vue'
import { userApi, type User } from '@/api/user'
import { useRecharge } from '@/composables/useRecharge'

const searchKey = ref('')
const users = ref<User[]>([])
const detailVisible = ref(false)
const rechargeVisible = ref(false)
const { pending, busy: recharging, storageError, restore, submit } = useRecharge()
const currentUser = ref<User | null>(null)

const rechargeForm = ref({
  amount: 100,
  paymentMethod: 'cash',
  remark: '',
})

// 筛选用户
const filteredUsers = computed(() => {
  if (!searchKey.value) return users.value
  const key = searchKey.value.toLowerCase()
  return users.value.filter(u =>
    u.nickname.toLowerCase().includes(key) ||
    u.phone?.includes(key)
  )
})

// 加载用户数据
const loadUsers = async () => {
  try {
    users.value = await userApi.getUsers()
  } catch (error) {
    console.error('加载用户失败', error)
  }
}

// 会员等级类型
const getLevelType = (level: string) => {
  const map: Record<string, TagProps['type']> = {
    normal: 'info',
    silver: 'info',
    gold: 'warning',
    diamond: 'danger',
  }
  return map[level] || 'info'
}

// 会员等级名称
const getLevelName = (level: string) => {
  const map: Record<string, string> = {
    normal: '普通',
    silver: '白银',
    gold: '黄金',
    diamond: '钻石',
  }
  return map[level] || level
}

// 查看详情
const handleDetail = (user: User) => {
  currentUser.value = user
  detailVisible.value = true
}

// 打开充值
const handleRecharge = (user: User) => {
  restore()
  if (pending.value && pending.value.userId !== user.id) {
    ElMessage.warning(`请先到计费管理确认会员 ${pending.value.userId} 的原充值结果`)
    return
  }
  currentUser.value = user
  rechargeForm.value = {
    amount: pending.value?.amount ?? 100,
    paymentMethod: pending.value?.paymentMethod ?? 'cash',
    remark: '',
  }
  rechargeVisible.value = true
}

// 提交充值
const submitRecharge = async () => {
  if (!currentUser.value || recharging.value) return

  const member = currentUser.value
  try {
    const receipt = await submit({ userId: member.id, amount: rechargeForm.value.amount,
      paymentMethod: rechargeForm.value.paymentMethod })

    // 更新本地数据
    member.balance = Number(receipt.balanceAfter)

    ElMessage.success(`充值已确认！会员 ${member.nickname}，金额 ¥${receipt.amount}`)
    rechargeVisible.value = false

    // 重新加载数据
    await loadUsers()
  } catch (error: any) {
    ElMessage.error(error.message || '充值结果尚未确认，请勿重复收款')
  }
}

onMounted(() => {
  loadUsers()
})
</script>

<style scoped lang="scss">
.users-container {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .balance {
    color: #536953;
    font-weight: bold;
  }
}

.user-detail {
  .detail-actions {
    margin-top: 20px;
    text-align: center;
  }
}

.recharge-form {
  .user-info {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 16px;
    background: #f4f0e6;
    border-radius: 3px;
    margin-bottom: 20px;

    .user-name {
      .name {
        font-size: 18px;
        font-weight: bold;
        color: #292f29;
      }

      .balance {
        font-size: 14px;
        color: #7c8071;
        margin-top: 4px;
      }
    }
  }

  .recharge-summary {
    background: #e8eddf;
    padding: 16px;
    border-radius: 3px;
    margin-top: 20px;

    .summary-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;

      &:first-child {
        border-bottom: 1px solid #dee6d4;
      }

      .amount {
        font-size: 20px;
        font-weight: bold;
        color: #536953;
      }
    }
  }
}
</style>
