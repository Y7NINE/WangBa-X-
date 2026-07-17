<template>
  <div class="shifts-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>交接班管理</span>
          <el-button type="primary" @click="handleHandover">发起交接班</el-button>
        </div>
      </template>
      
      <el-table :data="handoverRecords" stripe>
        <el-table-column prop="id" label="交接班ID" width="140" />
        <el-table-column prop="shiftType" label="班次" width="80">
          <template #default="{ row }">
            {{ getShiftName(row.shiftType) }}
          </template>
        </el-table-column>
        <el-table-column prop="outgoingStaff" label="交班人" width="80" />
        <el-table-column prop="incomingStaff" label="接班人" width="80" />
        <el-table-column prop="handoverTime" label="交接时间" width="180" />
        <el-table-column prop="cashDifference" label="现金差异" width="100">
          <template #default="{ row }">
            <span :style="{ color: row.cashDifference !== 0 ? '#f56c6c' : '#67c23a' }">
              {{ row.cashDifference > 0 ? '+' : '' }}¥{{ row.cashDifference }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'completed' ? 'success' : 'danger'">
              {{ row.status === 'completed' ? '正常' : '异常' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    
    <!-- 交接班弹窗 -->
    <el-dialog v-model="handoverVisible" title="交接班" width="500px">
      <el-form :model="handoverForm" label-width="100px">
        <el-form-item label="交班员工">
          <el-input v-model="handoverForm.outgoingStaff" disabled />
        </el-form-item>
        <el-form-item label="接班员工">
          <el-select v-model="handoverForm.incomingStaff" placeholder="请选择">
            <el-option label="李四" value="李四" />
            <el-option label="王五" value="王五" />
          </el-select>
        </el-form-item>
        <el-form-item label="班次">
          <el-select v-model="handoverForm.shiftType" placeholder="请选择">
            <el-option label="早班" value="morning" />
            <el-option label="中班" value="afternoon" />
            <el-option label="晚班" value="night" />
          </el-select>
        </el-form-item>
        <el-form-item label="实际现金">
          <el-input-number v-model="handoverForm.actualCash" :min="0" :precision="2" />
          <div class="form-tip">请仔细清点抽屉中的现金</div>
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input v-model="handoverForm.notes" type="textarea" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="handoverVisible = false">取消</el-button>
        <el-button type="primary" @click="submitHandover">提交交接</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const handoverVisible = ref(false)

const handoverForm = ref({
  outgoingStaff: '张三',
  incomingStaff: '',
  shiftType: '',
  actualCash: 0,
  notes: '',
})

const handoverRecords = ref([
  { id: '20240115-001', shiftType: 'morning', outgoingStaff: '张三', incomingStaff: '李四', handoverTime: '2024-01-15 14:05', cashDifference: -5, status: 'completed' },
  { id: '20240115-002', shiftType: 'afternoon', outgoingStaff: '李四', incomingStaff: '王五', handoverTime: '2024-01-15 22:05', cashDifference: -130, status: 'abnormal' },
])

const getShiftName = (type: string) => {
  const map: Record<string, string> = {
    morning: '早班',
    afternoon: '中班',
    night: '晚班',
  }
  return map[type] || type
}

const handleHandover = () => {
  handoverForm.value = {
    outgoingStaff: '张三',
    incomingStaff: '',
    shiftType: '',
    actualCash: 0,
    notes: '',
  }
  handoverVisible.value = true
}

const submitHandover = async () => {
  if (!handoverForm.value.incomingStaff || !handoverForm.value.shiftType) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  try {
    await ElMessageBox.confirm('确认提交交接班？提交后将无法修改', '确认', {
      type: 'warning',
    })
    ElMessage.success('交接班已提交')
    handoverVisible.value = false
  } catch {
    // 取消
  }
}
</script>

<style scoped lang="scss">
.shifts-container {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  .form-tip {
    font-size: 12px;
    color: #909399;
    margin-top: 4px;
  }
}
</style>
