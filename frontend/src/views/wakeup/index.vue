<template>
  <div class="wakeup-container">
    <div class="page-header">
      <h2>智能唤醒</h2>
      <el-button type="primary" @click="showCreate = true">
        <el-icon><Plus /></el-icon> 新建唤醒配置
      </el-button>
    </div>

    <el-table :data="configs" stripe v-loading="loading">
      <el-table-column prop="machineId" label="机器" width="120" />
      <el-table-column prop="wakeTime" label="唤醒时间" width="120" />
      <el-table-column label="唤醒方式" min-width="220">
        <template #default="{ row }">
          <el-tag v-if="row.headphone" size="small" class="tag">耳机</el-tag>
          <el-tag v-if="row.lightStrip" size="small" type="success" class="tag">灯带</el-tag>
          <el-tag v-if="row.screen" size="small" type="warning" class="tag">屏幕</el-tag>
          <el-tag v-if="row.humanWake" size="small" type="danger" class="tag">人工</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="snoozeInterval" label="间隔(分)" width="100" />
      <el-table-column prop="maxSnooze" label="最大次数" width="100" />
      <el-table-column prop="status" label="状态" width="110">
        <template #default="{ row }">
          <el-tag :type="statusType(row.status)">{{ statusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'scheduled'"
            size="small"
            type="danger"
            @click="handleCancel(row as WakeUpConfig)"
          >取消</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="showCreate" title="新建唤醒配置" width="480px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="机器编号">
          <el-input v-model="form.machineId" placeholder="如 A-01" />
        </el-form-item>
        <el-form-item label="唤醒时间">
          <el-time-picker v-model="form.wakeTime" placeholder="选择时间" format="HH:mm" />
        </el-form-item>
        <el-form-item label="唤醒方式">
          <el-checkbox v-model="form.headphone">耳机</el-checkbox>
          <el-checkbox v-model="form.lightStrip">灯带</el-checkbox>
          <el-checkbox v-model="form.screen">屏幕</el-checkbox>
          <el-checkbox v-model="form.humanWake">人工</el-checkbox>
        </el-form-item>
        <el-form-item label="重试间隔">
          <el-input-number v-model="form.snoozeInterval" :min="1" :max="30" />
          <span class="unit">分钟</span>
        </el-form-item>
        <el-form-item label="最大重试">
          <el-input-number v-model="form.maxSnooze" :min="0" :max="10" />
          <span class="unit">次</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showCreate = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleCreate">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { wakeupApi, WakeUpConfig } from '@/api/wakeup'

const configs = ref<WakeUpConfig[]>([])
const loading = ref(false)
const saving = ref(false)
const showCreate = ref(false)

const form = ref({
  machineId: '',
  wakeTime: null as Date | null,
  headphone: true,
  lightStrip: true,
  screen: true,
  humanWake: false,
  snoozeInterval: 5,
  maxSnooze: 2,
})

const statusType = (s: string) =>
  (({ scheduled: 'info', active: 'success', completed: 'info', cancelled: 'danger' } as const)[s as 'scheduled' | 'active' | 'completed' | 'cancelled'] || 'info')

const statusText = (s: string) =>
  ({ scheduled: '已计划', active: '进行中', completed: '已完成', cancelled: '已取消' }[s] || s)

const fetchConfigs = async () => {
  loading.value = true
  try {
    configs.value = await wakeupApi.getConfigs()
  } finally {
    loading.value = false
  }
}

const handleCreate = async () => {
  if (!form.value.machineId || !form.value.wakeTime) {
    ElMessage.warning('请填写机器编号和唤醒时间')
    return
  }
  saving.value = true
  try {
    const d = form.value.wakeTime
    const wakeTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    await wakeupApi.createConfig({ ...form.value, wakeTime } as any)
    ElMessage.success('创建成功')
    showCreate.value = false
    await fetchConfigs()
  } finally {
    saving.value = false
  }
}

const handleCancel = async (row: WakeUpConfig) => {
  await ElMessageBox.confirm('确定取消该唤醒配置？', '提示')
  await wakeupApi.cancelConfig(row.id)
  ElMessage.success('已取消')
  await fetchConfigs()
}

onMounted(fetchConfigs)
</script>

<style scoped lang="scss">
.wakeup-container {
  padding: 20px;
}
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  h2 { margin: 0; }
}
.tag { margin-right: 4px; }
.unit { margin-left: 8px; color: #7c8071; }
</style>
