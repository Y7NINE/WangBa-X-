<template>
  <div class="seats-container">
    <!-- 顶部统计 -->
    <div class="stats-bar">
      <el-row :gutter="20">
        <el-col :span="4">
          <div class="stat-item">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">总机器</div>
          </div>
        </el-col>
        <el-col :span="4">
          <div class="stat-item online">
            <div class="stat-value">{{ stats.online }}</div>
            <div class="stat-label">使用中</div>
          </div>
        </el-col>
        <el-col :span="4">
          <div class="stat-item offline">
            <div class="stat-value">{{ stats.offline }}</div>
            <div class="stat-label">空闲</div>
          </div>
        </el-col>
        <el-col :span="4">
          <div class="stat-item fault">
            <div class="stat-value">{{ stats.fault }}</div>
            <div class="stat-label">故障</div>
          </div>
        </el-col>
        <el-col :span="4">
          <div class="stat-item dirty">
            <div class="stat-value">{{ stats.dirty }}</div>
            <div class="stat-label">待清理</div>
          </div>
        </el-col>
        <el-col :span="4">
          <div class="stat-item cleaning">
            <div class="stat-value">{{ stats.cleaning }}</div>
            <div class="stat-label">清理中</div>
          </div>
        </el-col>
      </el-row>
    </div>
    
    <!-- 视图切换和区域筛选 -->
    <div class="filter-bar">
      <div class="filter-left">
        <el-radio-group v-model="selectedArea" @change="handleAreaChange">
          <el-radio-button :label="0">全部区域</el-radio-button>
          <el-radio-button
            v-for="area in machineStore.areas"
            :key="area.id"
            :label="area.id"
          >
            {{ area.name }}
          </el-radio-button>
        </el-radio-group>
      </div>
      <div class="filter-right">
        <el-radio-group v-model="viewMode">
          <el-radio-button label="floor">
            <el-icon><Grid /></el-icon> 平面图
          </el-radio-button>
          <el-radio-button label="grid">
            <el-icon><Menu /></el-icon> 列表
          </el-radio-button>
        </el-radio-group>
      </div>
    </div>
    
    <!-- 平面图视图 -->
    <div v-if="viewMode === 'floor'" class="floor-plan-container">
      <div class="floor-plan">
        <!-- 店铺入口 -->
        <div class="entrance">
          <div class="door">入口</div>
          <div class="entrance-label">大门</div>
        </div>
        
        <!-- 收银台 -->
        <div class="counter">
          <div class="counter-desk">
            <el-icon :size="24"><Monitor /></el-icon>
            <span>收银台</span>
          </div>
        </div>
        
        <!-- 竞技区 A -->
        <div class="area-section area-a" :class="{ 'area-hidden': selectedArea !== 0 && selectedArea !== 1 }">
          <div class="area-title">
            <el-tag type="danger" effect="dark">竞技区</el-tag>
            <span class="area-price">¥15/小时</span>
          </div>
          <div class="area-grid">
            <div
              v-for="machine in areaAMachines"
              :key="machine.id"
              class="seat-slot"
              :class="machine.status"
              @click="handleSeatClick(machine)"
            >
              <div class="seat-icon">
                <el-icon :size="20"><Monitor /></el-icon>
              </div>
              <div class="seat-label">{{ machine.id }}</div>
              
              <!-- 清理中/待清理状态显示进度 -->
              <div v-if="machine.status === 'cleaning'" class="cleaning-progress">
                <el-icon class="spin"><Loading /></el-icon>
                <span class="cleaning-text">清理中</span>
                <el-progress :percentage="getCleaningProgress(machine.id)" :stroke-width="4" :show-text="false" />
              </div>
              <div v-else-if="machine.status === 'dirty'" class="cleaning-progress dirty">
                <el-icon><Brush /></el-icon>
                <span class="cleaning-text">待清理</span>
                <div class="waiting-bar"></div>
              </div>
              <div v-else class="seat-dot" :class="machine.status"></div>
            </div>
          </div>
        </div>
        
        <!-- 休闲区 B -->
        <div class="area-section area-b" :class="{ 'area-hidden': selectedArea !== 0 && selectedArea !== 2 }">
          <div class="area-title">
            <el-tag type="primary" effect="dark">休闲区</el-tag>
            <span class="area-price">¥10/小时</span>
          </div>
          <div class="area-grid">
            <div
              v-for="machine in areaBMachines"
              :key="machine.id"
              class="seat-slot"
              :class="machine.status"
              @click="handleSeatClick(machine)"
            >
              <div class="seat-icon">
                <el-icon :size="20"><Monitor /></el-icon>
              </div>
              <div class="seat-label">{{ machine.id }}</div>
              
              <!-- 清理中/待清理状态显示进度 -->
              <div v-if="machine.status === 'cleaning'" class="cleaning-progress">
                <el-icon class="spin"><Loading /></el-icon>
                <span class="cleaning-text">清理中</span>
                <el-progress :percentage="getCleaningProgress(machine.id)" :stroke-width="4" :show-text="false" />
              </div>
              <div v-else-if="machine.status === 'dirty'" class="cleaning-progress dirty">
                <el-icon><Brush /></el-icon>
                <span class="cleaning-text">待清理</span>
                <div class="waiting-bar"></div>
              </div>
              <div v-else class="seat-dot" :class="machine.status"></div>
            </div>
          </div>
        </div>
        
        <!-- 包间 C -->
        <div class="area-section area-c" :class="{ 'area-hidden': selectedArea !== 0 && selectedArea !== 3 }">
          <div class="area-title">
            <el-tag type="warning" effect="dark">包间</el-tag>
            <span class="area-price">¥20/小时</span>
          </div>
          <div class="area-grid rooms">
            <div class="room" v-for="i in 3" :key="i">
              <div class="room-label">包间{{ i }}</div>
              <div class="room-seats">
                <div
                  v-for="j in 2"
                  :key="`${i}-${j}`"
                  class="seat-slot small"
                  :class="getRoomMachine(i, j)?.status"
                  @click="getRoomMachine(i, j) && handleSeatClick(getRoomMachine(i, j)!)"
                >
                  <div class="seat-icon">
                    <el-icon :size="16"><Monitor /></el-icon>
                  </div>
                  <div class="seat-label">{{ getRoomMachine(i, j)?.id || `C-${i}${j}` }}</div>
                  
                  <!-- 清理中/待清理状态显示进度 -->
                  <div v-if="getRoomMachine(i, j)?.status === 'cleaning'" class="cleaning-progress mini">
                    <el-icon class="spin"><Loading /></el-icon>
                    <span class="cleaning-text">清理中</span>
                  </div>
                  <div v-else-if="getRoomMachine(i, j)?.status === 'dirty'" class="cleaning-progress mini dirty">
                    <el-icon><Brush /></el-icon>
                    <span class="cleaning-text">待清理</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 水吧区域 -->
        <div class="bar-section">
          <div class="bar-counter">
            <el-icon :size="24"><Coffee /></el-icon>
            <span>水吧</span>
          </div>
        </div>
        
        <!-- 洗手间 -->
        <div class="restroom">
          <el-icon :size="20"><Male /></el-icon>
          <span>洗手间</span>
        </div>
      </div>
      
      <!-- 图例 -->
      <div class="floor-legend">
        <div class="legend-item">
          <span class="legend-dot online"></span>
          <span>使用中</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot offline"></span>
          <span>空闲</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot fault"></span>
          <span>故障</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot dirty"></span>
          <span>待清理</span>
        </div>
        <div class="legend-item">
          <span class="legend-dot cleaning"></span>
          <span>清理中</span>
        </div>
      </div>
    </div>
    
    <!-- 网格视图 -->
    <div v-else class="grid-view-container">
      <div class="seat-map">
        <div
          v-for="machine in filteredMachines"
          :key="machine.id"
          class="seat"
          :class="machine.status"
          @click="handleSeatClick(machine)"
        >
          <div class="seat-id">{{ machine.id }}</div>
          <div class="seat-status">{{ getStatusText(machine.status) }}</div>
          <div v-if="machine.currentUserId" class="seat-user">
            用户{{ machine.currentUserId }}
          </div>
        </div>
      </div>
      
      <!-- 图例 -->
      <div class="legend">
        <div class="legend-item">
          <span class="legend-color online"></span>
          <span>使用中</span>
        </div>
        <div class="legend-item">
          <span class="legend-color offline"></span>
          <span>空闲</span>
        </div>
        <div class="legend-item">
          <span class="legend-color fault"></span>
          <span>故障</span>
        </div>
        <div class="legend-item">
          <span class="legend-color dirty"></span>
          <span>待清理</span>
        </div>
        <div class="legend-item">
          <span class="legend-color cleaning"></span>
          <span>清理中</span>
        </div>
      </div>
    </div>
    
    <!-- 机器详情弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="`机器详情 - ${selectedMachine?.id}`"
      width="500px"
    >
      <div v-if="selectedMachine" class="machine-detail">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="机器编号">{{ selectedMachine.id }}</el-descriptions-item>
          <el-descriptions-item label="所在区域">
            {{ getAreaName(selectedMachine.areaId) }}
          </el-descriptions-item>
          <el-descriptions-item label="当前状态">
            <el-tag :type="getStatusTagType(selectedMachine.status)">
              {{ getStatusText(selectedMachine.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="IP地址">{{ selectedMachine.ipAddress || '-' }}</el-descriptions-item>
          <el-descriptions-item label="当前用户">{{ selectedMachine.currentUserId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="最后心跳">{{ selectedMachine.lastHeartbeat || '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="selectedMachine.faultType" label="故障类型">
            {{ selectedMachine.faultType }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div class="machine-actions">
          <el-button-group>
            <el-button
              v-if="selectedMachine.status === 'offline'"
              type="success"
              @click="handleStatusChange('online')"
            >
              开机
            </el-button>
            <el-button
              v-if="selectedMachine.status === 'online'"
              type="warning"
              @click="handleStatusChange('offline')"
            >
              关机
            </el-button>
            <el-button
              v-if="selectedMachine.status === 'fault'"
              type="primary"
              @click="handleStatusChange('repairing')"
            >
              开始维修
            </el-button>
            <el-button
              v-if="selectedMachine.status === 'repairing'"
              type="success"
              @click="handleStatusChange('offline')"
            >
              维修完成
            </el-button>
            <el-button
              v-if="selectedMachine.status === 'dirty'"
              type="primary"
              @click="handleStatusChange('cleaning')"
            >
              开始清理
            </el-button>
            <el-button
              v-if="selectedMachine.status === 'cleaning'"
              type="success"
              @click="handleStatusChange('offline')"
            >
              清理完成
            </el-button>
            <el-button
              type="danger"
              @click="handleReportFault"
            >
              报告故障
            </el-button>
          </el-button-group>
        </div>
      </div>
    </el-dialog>
    
    <!-- 报告故障弹窗 -->
    <el-dialog
      v-model="faultDialogVisible"
      title="报告故障"
      width="400px"
    >
      <el-form :model="faultForm" label-width="80px">
        <el-form-item label="故障类型">
          <el-select v-model="faultForm.faultType" placeholder="请选择故障类型">
            <el-option label="鼠标故障" value="mouse" />
            <el-option label="键盘故障" value="keyboard" />
            <el-option label="耳机故障" value="headset" />
            <el-option label="显示器故障" value="monitor" />
            <el-option label="网络异常" value="network" />
            <el-option label="机器卡顿" value="slow" />
            <el-option label="硬件过热" value="overheat" />
            <el-option label="蓝屏" value="bsod" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="故障描述">
          <el-input
            v-model="faultForm.description"
            type="textarea"
            placeholder="请描述故障情况"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="faultDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="submitFault">提交</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading, Brush, Monitor, Grid, Menu, Coffee, Male } from '@element-plus/icons-vue'
import { useMachineStore } from '@/stores/machine'
import { machineApi, Machine } from '@/api/machine'
import { faultApi } from '@/api/fault'

const machineStore = useMachineStore()

const selectedArea = ref(0)
const viewMode = ref('floor')
const dialogVisible = ref(false)
const faultDialogVisible = ref(false)
const selectedMachine = ref<Machine | null>(null)

const faultForm = ref({
  faultType: '',
  description: '',
})

const stats = computed(() => machineStore.stats)

// 按区域分类机器
const areaAMachines = computed(() => machineStore.machines.filter(m => m.areaId === 1))
const areaBMachines = computed(() => machineStore.machines.filter(m => m.areaId === 2))
const areaCMachines = computed(() => machineStore.machines.filter(m => m.areaId === 3))

const getRoomMachine = (room: number, seat: number) => {
  // 包间机器ID: C-01, C-02, C-03, C-04, C-05, C-06
  // 包间1: C-01, C-02
  // 包间2: C-03, C-04
  // 包间3: C-05, C-06
  const index = (room - 1) * 2 + seat
  const id = `C-${String(index).padStart(2, '0')}`
  return machineStore.machines.find(m => m.id === id) || null
}

const filteredMachines = computed(() => {
  if (selectedArea.value === 0) {
    return machineStore.machines
  }
  return machineStore.machines.filter(m => m.areaId === selectedArea.value)
})

const getAreaName = (areaId: number) => {
  const area = machineStore.areas.find(a => a.id === areaId)
  return area?.name || `区域${areaId}`
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    online: '使用中',
    offline: '空闲',
    fault: '故障',
    repairing: '维修中',
    dirty: '待清理',
    cleaning: '清理中',
    maintenance: '维护中',
  }
  return map[status] || status
}

const getStatusTagType = (status: string) => {
  const map: Record<string, string> = {
    online: 'success',
    offline: 'info',
    fault: 'danger',
    repairing: 'warning',
    dirty: 'warning',
    cleaning: '',
  }
  return map[status] || ''
}

const handleAreaChange = () => {
  // 区域筛选变化
}

// 模拟清理进度（实际应该从后端获取）
const cleaningProgress = ref<Record<string, number>>({})
const cleaningTimers = ref<Record<string, any>>({})

const getCleaningProgress = (machineId: string) => {
  return cleaningProgress.value[machineId] || 0
}

// 开始清理时启动进度模拟
const startCleaningProgress = (machineId: string) => {
  cleaningProgress.value[machineId] = 0
  cleaningTimers.value[machineId] = setInterval(() => {
    if (cleaningProgress.value[machineId] < 100) {
      cleaningProgress.value[machineId] += 10
    } else {
      clearInterval(cleaningTimers.value[machineId])
      delete cleaningTimers.value[machineId]
    }
  }, 300) // 3秒完成清理
}

// 停止清理进度
const stopCleaningProgress = (machineId: string) => {
  if (cleaningTimers.value[machineId]) {
    clearInterval(cleaningTimers.value[machineId])
    delete cleaningTimers.value[machineId]
  }
  delete cleaningProgress.value[machineId]
}

const handleSeatClick = (machine: Machine) => {
  selectedMachine.value = machine
  dialogVisible.value = true
}

const handleStatusChange = async (status: string) => {
  if (!selectedMachine.value) return
  
  try {
    const machineId = selectedMachine.value.id
    await machineApi.updateStatus(machineId, status)
    
    // 重新获取最新数据确保同步
    await machineStore.fetchMachines()
    
    // 更新选中的机器
    const updatedMachine = machineStore.machines.find(m => m.id === machineId)
    if (updatedMachine) {
      selectedMachine.value = updatedMachine
    }
    
    // 启动/停止清理进度
    if (status === 'cleaning') {
      startCleaningProgress(machineId)
    } else if (status === 'offline') {
      stopCleaningProgress(machineId)
    }
    
    ElMessage.success('状态更新成功')
  } catch (error) {
    ElMessage.error('状态更新失败')
  }
}

const handleReportFault = () => {
  faultForm.value = { faultType: '', description: '' }
  faultDialogVisible.value = true
}

const submitFault = async () => {
  if (!selectedMachine.value || !faultForm.value.faultType) {
    ElMessage.warning('请选择故障类型')
    return
  }
  
  try {
    await faultApi.createTicket({
      machineId: selectedMachine.value.id,
      faultType: faultForm.value.faultType,
      description: faultForm.value.description,
    })
    
    // 重新获取最新数据确保同步
    await machineStore.fetchMachines()
    
    faultDialogVisible.value = false
    dialogVisible.value = false
    ElMessage.success('故障报告已提交')
  } catch (error) {
    ElMessage.error('提交失败')
  }
}
</script>

<style scoped lang="scss">
.seats-container {
  .stats-bar {
    background: #fff;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    
    .stat-item {
      text-align: center;
      padding: 16px;
      border-radius: 8px;
      background: #f5f7fa;
      
      .stat-value {
        font-size: 32px;
        font-weight: bold;
        color: #303133;
      }
      
      .stat-label {
        font-size: 14px;
        color: #909399;
        margin-top: 8px;
      }
      
      &.online .stat-value { color: #67c23a; }
      &.offline .stat-value { color: #909399; }
      &.fault .stat-value { color: #f56c6c; }
      &.dirty .stat-value { color: #e6a23c; }
      &.cleaning .stat-value { color: #409eff; }
    }
  }
  
  .filter-bar {
    background: #fff;
    padding: 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  
  // 平面图样式
  .floor-plan-container {
    background: #fff;
    padding: 24px;
    border-radius: 8px;
    margin-bottom: 20px;
    
    .floor-plan {
      position: relative;
      width: 100%;
      min-height: 600px;
      background: #f8f9fa;
      border: 2px solid #e4e7ed;
      border-radius: 12px;
      padding: 20px;
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      grid-template-rows: auto auto 1fr auto;
      gap: 20px;
      
      // 入口
      .entrance {
        grid-column: 1 / -1;
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 10px;
        
        .door {
          background: #409eff;
          color: #fff;
          padding: 8px 40px;
          border-radius: 4px;
          font-weight: bold;
        }
        
        .entrance-label {
          margin-top: 4px;
          font-size: 12px;
          color: #909399;
        }
      }
      
      // 收银台
      .counter {
        grid-column: 1 / -1;
        display: flex;
        justify-content: center;
        
        .counter-desk {
          background: linear-gradient(135deg, #304156, #3a4f65);
          color: #fff;
          padding: 12px 40px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
        }
      }
      
      // 区域
      .area-section {
        background: #fff;
        border-radius: 8px;
        padding: 16px;
        border: 1px solid #e4e7ed;
        
        &.area-hidden {
          opacity: 0.3;
          pointer-events: none;
        }
        
        .area-title {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          
          .area-price {
            font-size: 12px;
            color: #909399;
          }
        }
        
        .area-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 10px;
          
          &.rooms {
            grid-template-columns: repeat(3, 1fr);
            
            .room {
              background: #fafafa;
              border: 1px dashed #dcdfe6;
              border-radius: 8px;
              padding: 10px;
              
              .room-label {
                font-size: 12px;
                color: #606266;
                margin-bottom: 8px;
                text-align: center;
              }
              
              .room-seats {
                display: flex;
                gap: 8px;
                justify-content: center;
              }
            }
          }
          
          .seat-slot {
            background: #fff;
            border: 2px solid #e4e7ed;
            border-radius: 8px;
            padding: 10px 8px;
            display: flex;
            flex-direction: column;
            align-items: center;
            cursor: pointer;
            transition: all 0.3s;
            
            .seat-icon {
              color: #606266;
              margin-bottom: 4px;
            }
            
            .seat-label {
              font-size: 11px;
              font-weight: bold;
              color: #303133;
            }
            
            .seat-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              margin-top: 6px;
              
              &.online { background: #67c23a; box-shadow: 0 0 6px #67c23a; }
              &.offline { background: #c0c4cc; }
              &.fault { background: #f56c6c; box-shadow: 0 0 6px #f56c6c; animation: dot-blink 1s infinite; }
              &.dirty { background: #e6a23c; }
              &.cleaning { background: #409eff; }
            }
            
            // 清理进度样式
            .cleaning-progress {
              width: 100%;
              margin-top: 6px;
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4px;
              
              .spin {
                animation: spin 1s linear infinite;
                color: #409eff;
              }
              
              .cleaning-text {
                font-size: 10px;
                color: #409eff;
                font-weight: bold;
              }
              
              &.dirty {
                .cleaning-text {
                  color: #e6a23c;
                }
                
                .el-icon {
                  color: #e6a23c;
                }
              }
              
              &.mini {
                margin-top: 4px;
                
                .cleaning-text {
                  font-size: 9px;
                }
              }
              
              .waiting-bar {
                width: 80%;
                height: 4px;
                background: #e6a23c;
                border-radius: 2px;
                animation: pulse 1.5s infinite;
              }
              
              :deep(.el-progress) {
                width: 80%;
              }
            }
            
            &.online {
              border-color: #67c23a;
              background: #f0f9ff;
            }
            
            &.fault {
              border-color: #f56c6c;
              background: #fef0f0;
              animation: fault-pulse 2s infinite;
            }
            
            &.dirty {
              border-color: #e6a23c;
              background: #fdf6ec;
            }
            
            &.cleaning {
              border-color: #409eff;
              background: #ecf5ff;
            }
            
            &:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
            }
            
            &.small {
              padding: 6px;
              
              .seat-icon { margin-bottom: 2px; }
              .seat-label { font-size: 10px; }
            }
          }
        }
      }
      
      // 水吧
      .bar-section {
        grid-column: 1 / 2;
        display: flex;
        align-items: center;
        justify-content: center;
        
        .bar-counter {
          background: linear-gradient(135deg, #e6a23c, #ebb563);
          color: #fff;
          padding: 16px 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: bold;
        }
      }
      
      // 洗手间
      .restroom {
        grid-column: 3 / 4;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        background: #f0f0f0;
        border-radius: 8px;
        padding: 16px;
        color: #606266;
      }
    }
    
    .floor-legend {
      margin-top: 20px;
      display: flex;
      gap: 24px;
      justify-content: center;
      
      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        
        .legend-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          
          &.online { background: #67c23a; box-shadow: 0 0 6px #67c23a; }
          &.offline { background: #c0c4cc; }
          &.fault { background: #f56c6c; box-shadow: 0 0 6px #f56c6c; }
          &.dirty { background: #e6a23c; }
          &.cleaning { background: #409eff; }
        }
      }
    }
  }
  
  // 网格视图样式
  .grid-view-container {
    background: #fff;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    
    .seat-map {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 16px;
      
      .seat {
        width: 100%;
        aspect-ratio: 1;
        border-radius: 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s;
        font-size: 12px;
        color: #fff;
        
        .seat-id {
          font-size: 16px;
          font-weight: bold;
          margin-bottom: 4px;
        }
        
        .seat-status {
          font-size: 11px;
          opacity: 0.9;
        }
        
        .seat-user {
          font-size: 10px;
          margin-top: 4px;
          opacity: 0.8;
        }
        
        &.online {
          background: linear-gradient(135deg, #67c23a, #85ce61);
        }
        
        &.offline {
          background: linear-gradient(135deg, #909399, #a8abb2);
        }
        
        &.fault {
          background: linear-gradient(135deg, #f56c6c, #f89898);
          animation: fault-blink 1s ease-in-out infinite;
        }
        
        &.dirty {
          background: linear-gradient(135deg, #e6a23c, #ebb563);
        }
        
        &.cleaning {
          background: linear-gradient(135deg, #409eff, #66b1ff);
        }
        
        &:hover {
          transform: scale(1.05);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
      }
    }
    
    .legend {
      margin-top: 20px;
      display: flex;
      gap: 24px;
      justify-content: center;
      
      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        
        .legend-color {
          width: 16px;
          height: 16px;
          border-radius: 4px;
          
          &.online { background: #67c23a; }
          &.offline { background: #909399; }
          &.fault { background: #f56c6c; }
          &.dirty { background: #e6a23c; }
          &.cleaning { background: #409eff; }
        }
      }
    }
  }
  
  .machine-detail {
    .machine-actions {
      margin-top: 20px;
      text-align: center;
    }
  }
}

@keyframes fault-blink {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 10px rgba(245, 108, 108, 0.5);
  }
  50% {
    opacity: 0.85;
    box-shadow: 0 0 20px rgba(245, 108, 108, 0.8);
  }
}

@keyframes fault-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.4);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(245, 108, 108, 0);
  }
}

@keyframes dot-blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; transform: scaleX(1); }
  50% { opacity: 0.6; transform: scaleX(0.8); }
}
</style>
