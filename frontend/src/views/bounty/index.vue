<template>
  <div class="bounty-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>悬赏任务管理</span>
          <el-button type="primary" @click="handleCreate">
            <el-icon><Plus /></el-icon> 新建任务
          </el-button>
        </div>
      </template>
      
      <el-table :data="tasks" stripe>
        <el-table-column prop="id" label="任务ID" width="120" />
        <el-table-column prop="name" label="任务名称" width="150" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)">{{ getTypeName(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="rewardType" label="奖励类型" width="100">
          <template #default="{ row }">
            {{ getRewardName(row.rewardType) }}
          </template>
        </el-table-column>
        <el-table-column prop="rewardAmount" label="奖励数量" width="100">
          <template #default="{ row }">
            <span class="reward">{{ row.rewardAmount }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="completions" label="完成次数" width="100" />
        <el-table-column prop="isActive" label="状态" width="100">
          <template #default="{ row }">
            <el-switch
              v-model="row.isActive"
              @change="handleToggleStatus(row)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button size="small" @click="handleEdit(row)">
                <el-icon><Edit /></el-icon> 编辑
              </el-button>
              <el-button size="small" type="danger" @click="handleDelete(row)">
                <el-icon><Delete /></el-icon> 删除
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 新建/编辑任务弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑任务' : '新建任务'"
      width="600px"
    >
      <el-form :model="taskForm" :rules="rules" ref="formRef" label-width="100px">
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="taskForm.name" placeholder="请输入任务名称" />
        </el-form-item>
        
        <el-form-item label="任务类型" prop="type">
          <el-select v-model="taskForm.type" placeholder="请选择任务类型">
            <el-option label="拉新任务" value="referral" />
            <el-option label="驻场任务" value="resident" />
            <el-option label="闲时任务" value="idle" />
            <el-option label="消费任务" value="consumption" />
            <el-option label="签到任务" value="checkin" />
            <el-option label="游戏任务" value="game" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="任务描述" prop="description">
          <el-input
            v-model="taskForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入任务描述"
          />
        </el-form-item>
        
        <el-form-item label="奖励类型" prop="rewardType">
          <el-select v-model="taskForm.rewardType" placeholder="请选择奖励类型">
            <el-option label="积分" value="credit" />
            <el-option label="时长" value="time" />
            <el-option label="优惠券" value="coupon" />
            <el-option label="徽章" value="badge" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="奖励数量" prop="rewardAmount">
          <el-input-number
            v-model="taskForm.rewardAmount"
            :min="1"
            :max="10000"
            style="width: 100%"
          />
        </el-form-item>
        
        <el-form-item label="最大完成数">
          <el-input-number
            v-model="taskForm.maxCompletions"
            :min="0"
            placeholder="0表示不限"
            style="width: 100%"
          />
          <div class="form-tip">设为0表示不限制完成次数</div>
        </el-form-item>
        
        <el-form-item label="状态">
          <el-switch v-model="taskForm.isActive" active-text="启用" inactive-text="禁用" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ isEdit ? '保存修改' : '创建任务' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import { Plus, Edit, Delete } from '@element-plus/icons-vue'

const dialogVisible = ref(false)
const isEdit = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const editingTask = ref<any>(null)

// 任务列表
const tasks = ref([
  { id: 'referral_001', name: '邀请新朋友', type: 'referral', description: '邀请1位新朋友扫码注册', rewardType: 'coupon', rewardAmount: 20, maxCompletions: 50, completions: 15, isActive: true },
  { id: 'resident_001', name: '带新手吃鸡', type: 'resident', description: '带本网吧的其他玩家吃鸡一次', rewardType: 'credit', rewardAmount: 1000, maxCompletions: 0, completions: 8, isActive: true },
  { id: 'idle_001', name: '周二闲时驻场', type: 'idle', description: '周二上午9点-12点在线满2小时', rewardType: 'time', rewardAmount: 60, maxCompletions: 30, completions: 12, isActive: true },
  { id: 'checkin_001', name: '每日签到', type: 'checkin', description: '每日签到获得积分', rewardType: 'credit', rewardAmount: 50, maxCompletions: 0, completions: 256, isActive: true },
])

// 表单数据
const taskForm = reactive({
  name: '',
  type: '',
  description: '',
  rewardType: '',
  rewardAmount: 100,
  maxCompletions: 0,
  isActive: true,
})

// 表单验证规则
const rules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  type: [{ required: true, message: '请选择任务类型', trigger: 'change' }],
  description: [{ required: true, message: '请输入任务描述', trigger: 'blur' }],
  rewardType: [{ required: true, message: '请选择奖励类型', trigger: 'change' }],
  rewardAmount: [{ required: true, message: '请输入奖励数量', trigger: 'blur' }],
}

// 类型标签颜色
const getTypeTag = (type: string) => {
  const map: Record<string, string> = {
    referral: 'success',
    resident: 'primary',
    idle: 'warning',
    consumption: '',
    checkin: 'info',
    game: 'danger',
  }
  return map[type] || ''
}

// 类型名称
const getTypeName = (type: string) => {
  const map: Record<string, string> = {
    referral: '拉新',
    resident: '驻场',
    idle: '闲时',
    consumption: '消费',
    checkin: '签到',
    game: '游戏',
  }
  return map[type] || type
}

// 奖励名称
const getRewardName = (type: string) => {
  const map: Record<string, string> = {
    credit: '积分',
    time: '时长',
    coupon: '优惠券',
    badge: '徽章',
  }
  return map[type] || type
}

// 重置表单
const resetForm = () => {
  taskForm.name = ''
  taskForm.type = ''
  taskForm.description = ''
  taskForm.rewardType = ''
  taskForm.rewardAmount = 100
  taskForm.maxCompletions = 0
  taskForm.isActive = true
  editingTask.value = null
}

// 新建任务
const handleCreate = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

// 编辑任务
const handleEdit = (task: any) => {
  isEdit.value = true
  editingTask.value = task
  
  taskForm.name = task.name
  taskForm.type = task.type
  taskForm.description = task.description
  taskForm.rewardType = task.rewardType
  taskForm.rewardAmount = task.rewardAmount
  taskForm.maxCompletions = task.maxCompletions
  taskForm.isActive = task.isActive
  
  dialogVisible.value = true
}

// 删除任务
const handleDelete = async (task: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除任务"${task.name}"吗？此操作不可恢复。`,
      '确认删除',
      { type: 'warning' }
    )
    
    const index = tasks.value.findIndex(t => t.id === task.id)
    if (index !== -1) {
      tasks.value.splice(index, 1)
      ElMessage.success('删除成功')
    }
  } catch {
    // 取消删除
  }
}

// 切换状态
const handleToggleStatus = (task: any) => {
  ElMessage.success(`任务"${task.name}"已${task.isActive ? '启用' : '禁用'}`)
}

// 提交表单
const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
  
  submitting.value = true
  
  try {
    if (isEdit.value && editingTask.value) {
      // 编辑模式
      Object.assign(editingTask.value, {
        name: taskForm.name,
        type: taskForm.type,
        description: taskForm.description,
        rewardType: taskForm.rewardType,
        rewardAmount: taskForm.rewardAmount,
        maxCompletions: taskForm.maxCompletions,
        isActive: taskForm.isActive,
      })
      ElMessage.success('编辑成功')
    } else {
      // 新建模式
      const newTask = {
        id: `${taskForm.type}_${Date.now()}`,
        name: taskForm.name,
        type: taskForm.type,
        description: taskForm.description,
        rewardType: taskForm.rewardType,
        rewardAmount: taskForm.rewardAmount,
        maxCompletions: taskForm.maxCompletions,
        completions: 0,
        isActive: taskForm.isActive,
      }
      tasks.value.push(newTask)
      ElMessage.success('创建成功')
    }
    
    dialogVisible.value = false
  } catch (error) {
    ElMessage.error('操作失败')
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped lang="scss">
.bounty-container {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .reward {
    color: #e6a23c;
    font-weight: bold;
  }
  
  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}
</style>
