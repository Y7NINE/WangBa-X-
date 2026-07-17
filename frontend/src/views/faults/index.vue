<template>
  <div class="faults-container">
    <!-- 顶部统计 -->
    <div class="stats-bar">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon pending">
              <el-icon :size="24"><Warning /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ pendingCount }}</div>
              <div class="stat-label">待处理</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon processing">
              <el-icon :size="24"><Loading /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ processingCount }}</div>
              <div class="stat-label">处理中</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon resolved">
              <el-icon :size="24"><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ resolvedToday }}</div>
              <div class="stat-label">今日已解决</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon timeout">
              <el-icon :size="24"><Timer /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-value">{{ avgResponseTime }}</div>
              <div class="stat-label">平均响应(分)</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
    
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <el-row :gutter="16">
        <el-col :span="6">
          <el-select v-model="filters.status" placeholder="状态筛选" clearable>
            <el-option label="待处理" value="pending" />
            <el-option label="已接单" value="accepted" />
            <el-option label="处理中" value="processing" />
            <el-option label="已换机" value="transferred" />
            <el-option label="已解决" value="resolved" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filters.priority" placeholder="优先级筛选" clearable>
            <el-option label="P0-紧急" value="P0" />
            <el-option label="P1-高" value="P1" />
            <el-option label="P2-中" value="P2" />
            <el-option label="P3-低" value="P3" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="filters.faultType" placeholder="故障类型" clearable>
            <el-option label="鼠标故障" value="mouse" />
            <el-option label="键盘故障" value="keyboard" />
            <el-option label="耳机故障" value="headset" />
            <el-option label="显示器故障" value="monitor" />
            <el-option label="网络异常" value="network" />
            <el-option label="硬件过热" value="overheat" />
            <el-option label="蓝屏" value="bsod" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button type="primary" @click="handleRefresh">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </el-col>
      </el-row>
    </div>
    
    <!-- 工单列表 -->
    <div class="ticket-list">
      <el-table
        :data="filteredTickets"
        stripe
        style="width: 100%"
        :row-class-name="getRowClassName"
      >
        <el-table-column prop="id" label="工单号" width="140" />
        <el-table-column prop="machineId" label="机器" width="80" />
        <el-table-column prop="priority" label="优先级" width="80">
          <template #default="{ row }">
            <el-tag :type="getPriorityType(row.priority)" effect="dark">
              {{ row.priority }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="faultType" label="故障类型" width="100">
          <template #default="{ row }">
            {{ getFaultTypeName(row.faultType) }}
          </template>
        </el-table-column>
        <el-table-column prop="source" label="来源" width="80">
          <template #default="{ row }">
            <el-tag :type="getSourceType(row.source)" size="small">
              {{ getSourceName(row.source) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusName(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="150" show-overflow-tooltip />
        <el-table-column prop="createdAt" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button-group>
              <el-button
                v-if="row.status === 'pending'"
                type="success"
                size="small"
                @click="handleAccept(row)"
              >
                接单
              </el-button>
              <el-button
                v-if = "['accepted', 'processing'].includes(row.status)"
                type="primary"
                size="small"
                @click="handleResolve(row)"
              >
                完成
              </el-button>
              <el-button
                v-if = "['accepted', 'processing'].includes(row.status)"
                type="warning"
                size="small"
                @click="handleTransfer(row)"
              >
                换机
              </el-button>
              <el-button
                size="small"
                @click="handleDetail(row)"
              >
                详情
              </el-button>
            </el-button-group>
          </template>
        </el-table-column>
      </el-table>
    </div>
    
    <!-- 工单详情弹窗 -->
    <el-dialog
      v-model="detailVisible"
      title="工单详情"
      width="600px"
    >
      <div v-if="currentTicket" class="ticket-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="工单号">{{ currentTicket.id }}</el-descriptions-item>
          <el-descriptions-item label="机器编号">{{ currentTicket.machineId }}</el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag :type="getPriorityType(currentTicket.priority)" effect="dark">
              {{ currentTicket.priority }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentTicket.status)">
              {{ getStatusName(currentTicket.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="故障类型">{{ getFaultTypeName(currentTicket.faultType) }}</el-descriptions-item>
          <el-descriptions-item label="来源">{{ getSourceName(currentTicket.source) }}</el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">{{ currentTicket.description || '-' }}</el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatTime(currentTicket.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="超时时间">{{ currentTicket.timeoutAt ? formatTime(currentTicket.timeoutAt) : '-' }}</el-descriptions-item>
        </el-descriptions>
        
        <div v-if="currentTicket.status === 'pending'" class="ticket-actions">
          <el-button type="success" @click="handleAccept(currentTicket)">接单处理</el-button>
        </div>
      </div>
    </el-dialog>
    
    <!-- 完成工单弹窗 -->
    <el-dialog
      v-model="resolveVisible"
      title="完成工单"
      width="400px"
    >
      <el-form :model="resolveForm" label-width="80px">
        <el-form-item label="处理方式">
          <el-select v-model="resolveForm.resolution" placeholder="请选择">
            <el-option label="更换设备" value="replaced_device" />
            <el-option label="修复问题" value="fixed" />
            <el-option label="重启解决" value="restart" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理备注">
          <el-input
            v-model="resolveForm.note"
            type="textarea"
            placeholder="请输入处理说明"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resolveVisible = false">取消</el-button>
        <el-button type="primary" @click="submitResolve">确认完成</el-button>
      </template>
    </el-dialog>
    
    <!-- 换机弹窗 -->
    <el-dialog
      v-model="transferVisible"
      title="申请换机"
      width="500px"
    >
      <div class="transfer-content">
        <p>当前故障机器：<strong>{{ currentTicket?.machineId }}</strong></p>
        <p>请选择目标机器：</p>
        
        <el-table :data="availableMachines" stripe @row-click="selectTargetMachine">
          <el-table-column prop="id" label="机器编号" width="100" />
          <el-table-column prop="areaId" label="区域" width="80">
            <template #default="{ row }">
              {{ getAreaName(row.areaId) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="80">
            <template #default="{ row }">
              <el-tag type="success" size="small">空闲</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80">
            <template #default="{ row }">
              <el-button
                :type="selectedTargetMachine === row.id ? 'primary' : 'default'"
                size="small"
              >
                {{ selectedTargetMachine === row.id ? '已选' : '选择' }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <template #footer>
        <el-button @click="transferVisible = false">取消</el-button>
        <el-button type="primary" @click="submitTransfer" :disabled="!selectedTargetMachine">
          确认换机
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFaultStore } from '@/stores/fault'
import { useMachineStore } from '@/stores/machine'
import { faultApi, FaultTicket } from '@/api/fault'
import dayjs from 'dayjs'

const faultStore = useFaultStore()
const machineStore = useMachineStore()

const filters = ref({
  status: '',
  priority: '',
  faultType: '',
})

const detailVisible = ref(false)
const resolveVisible = ref(false)
const transferVisible = ref(false)
const currentTicket = ref<FaultTicket | null>(null)
const selectedTargetMachine = ref('')

const resolveForm = ref({
  resolution: '',
  note: '',
})

// 统计数据
const pendingCount = computed(() => faultStore.pendingTickets.length)
const processingCount = computed(() => faultStore.processingTickets.length)
const resolvedToday = ref(12) // 示例数据
const avgResponseTime = ref(5) // 示例数据

// 筛选后的工单
const filteredTickets = computed(() => {
  let tickets = faultStore.sortedTickets
  
  if (filters.value.status) {
    tickets = tickets.filter(t => t.status === filters.value.status)
  }
  if (filters.value.priority) {
    tickets = tickets.filter(t => t.priority === filters.value.priority)
  }
  if (filters.value.faultType) {
    tickets = tickets.filter(t => t.faultType === filters.value.faultType)
  }
  
  return tickets
})

// 可用的空闲机器
const availableMachines = computed(() => {
  return machineStore.machines.filter(m => m.status === 'offline')
})

const getPriorityType = (priority: string) => {
  const map: Record<string, string> = {
    P0: 'danger',
    P1: 'warning',
    P2: '',
    P3: 'info',
  }
  return map[priority] || ''
}

const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'danger',
    accepted: 'warning',
    processing: '',
    transferred: 'warning',
    resolved: 'success',
    cancelled: 'info',
  }
  return map[status] || ''
}

const getStatusName = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    accepted: '已接单',
    processing: '处理中',
    transferred: '已换机',
    resolved: '已解决',
    cancelled: '已取消',
    escalated: '已升级',
  }
  return map[status] || status
}

const getFaultTypeName = (type: string) => {
  const map: Record<string, string> = {
    mouse: '鼠标故障',
    keyboard: '键盘故障',
    headset: '耳机故障',
    monitor: '显示器故障',
    network: '网络异常',
    slow: '机器卡顿',
    overheat: '硬件过热',
    bsod: '蓝屏',
    offline: '机器离线',
    other: '其他',
  }
  return map[type] || type
}

const getSourceType = (source: string) => {
  const map: Record<string, string> = {
    auto_detect: 'danger',
    player_report: 'warning',
    staff_report: '',
  }
  return map[source] || ''
}

const getSourceName = (source: string) => {
  const map: Record<string, string> = {
    auto_detect: '自动检测',
    player_report: '玩家上报',
    staff_report: '员工上报',
  }
  return map[source] || source
}

const getAreaName = (areaId: number) => {
  const area = machineStore.areas.find(a => a.id === areaId)
  return area?.name || `区域${areaId}`
}

const getRowClassName = ({ row }: { row: FaultTicket }) => {
  if (row.priority === 'P0') return 'row-p0'
  if (row.priority === 'P1') return 'row-p1'
  return ''
}

const formatTime = (time: string) => {
  return dayjs(time).format('YYYY-MM-DD HH:mm:ss')
}

const handleRefresh = () => {
  faultStore.fetchTickets()
}

const handleDetail = (ticket: FaultTicket) => {
  currentTicket.value = ticket
  detailVisible.value = true
}

const handleAccept = async (ticket: FaultTicket) => {
  try {
    await ElMessageBox.confirm('确认接单处理此故障？', '确认', {
      type: 'warning',
    })
    
    await faultApi.acceptTicket(ticket.id)
    faultStore.updateTicket(ticket.id, {
      status: 'accepted',
      handlerId: 1, // 当前用户ID
    })
    
    ElMessage.success('已接单')
    detailVisible.value = false
  } catch (error) {
    // 取消操作
  }
}

const handleResolve = (ticket: FaultTicket) => {
  currentTicket.value = ticket
  resolveForm.value = { resolution: '', note: '' }
  resolveVisible.value = true
}

const submitResolve = async () => {
  if (!currentTicket.value || !resolveForm.value.resolution) {
    ElMessage.warning('请选择处理方式')
    return
  }
  
  try {
    await faultApi.resolveTicket(currentTicket.value.id, resolveForm.value)
    faultStore.updateTicket(currentTicket.value.id, { status: 'resolved' })
    
    // 更新机器状态
    machineStore.updateMachineStatus(currentTicket.value.machineId, 'offline')
    
    resolveVisible.value = false
    ElMessage.success('工单已完成')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const handleTransfer = (ticket: FaultTicket) => {
  currentTicket.value = ticket
  selectedTargetMachine.value = ''
  transferVisible.value = true
}

const selectTargetMachine = (row: any) => {
  selectedTargetMachine.value = row.id
}

const submitTransfer = async () => {
  if (!currentTicket.value || !selectedTargetMachine.value) {
    ElMessage.warning('请选择目标机器')
    return
  }
  
  try {
    await faultApi.transferTicket(currentTicket.value.id, selectedTargetMachine.value)
    faultStore.updateTicket(currentTicket.value.id, {
      status: 'transferred',
      newMachineId: selectedTargetMachine.value,
    })
    
    // 更新机器状态
    machineStore.updateMachineStatus(currentTicket.value.machineId, 'fault')
    
    transferVisible.value = false
    ElMessage.success('换机成功')
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

onMounted(() => {
  faultStore.fetchTickets()
})
</script>

<style scoped lang="scss">
.faults-container {
  .stats-bar {
    margin-bottom: 20px;
    
    .stat-card {
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 16px;
      
      .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
        
        &.pending { background: #f56c6c; }
        &.processing { background: #e6a23c; }
        &.resolved { background: #67c23a; }
        &.timeout { background: #409eff; }
      }
      
      .stat-info {
        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #303133;
        }
        
        .stat-label {
          font-size: 14px;
          color: #909399;
        }
      }
    }
  }
  
  .filter-bar {
    background: #fff;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 20px;
  }
  
  .ticket-list {
    background: #fff;
    padding: 16px;
    border-radius: 8px;
    
    :deep(.el-table) {
      .row-p0 {
        background-color: #fef0f0 !important;
      }
      
      .row-p1 {
        background-color: #fdf6ec !important;
      }
    }
  }
  
  .ticket-detail {
    .ticket-actions {
      margin-top: 20px;
      text-align: center;
    }
  }
  
  .transfer-content {
    p {
      margin-bottom: 12px;
    }
  }
}
</style>
