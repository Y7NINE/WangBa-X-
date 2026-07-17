<template>
  <div class="cleaning-container">
    <!-- 顶部统计 -->
    <div class="stats-bar">
      <el-row :gutter="20">
        <el-col :span="8">
          <div class="stat-card pending">
            <div class="stat-icon">
              <el-icon :size="28"><Brush /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ pendingTasks.length }}</div>
              <div class="stat-label">待清理</div>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-card processing">
            <div class="stat-icon">
              <el-icon :size="28"><Loading /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ processingTasks.length }}</div>
              <div class="stat-label">清理中</div>
            </div>
          </div>
        </el-col>
        <el-col :span="8">
          <div class="stat-card completed">
            <div class="stat-icon">
              <el-icon :size="28"><CircleCheck /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ completedTasks.length }}</div>
              <div class="stat-label">今日已完成</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
    
    <el-tabs v-model="activeTab">
      <!-- 待清理任务 -->
      <el-tab-pane label="待清理任务" name="pending">
        <div class="task-grid">
          <div
            v-for="task in pendingTasks"
            :key="task.id"
            class="task-card pending"
          >
            <div class="task-header">
              <el-tag type="warning" effect="dark">待清理</el-tag>
              <span class="task-time">{{ formatTime(task.createdAt) }}</span>
            </div>
            <div class="task-body">
              <div class="machine-info">
                <el-icon :size="32"><Monitor /></el-icon>
                <div class="machine-id">{{ task.machineId }}</div>
                <div class="machine-area">{{ getMachineArea(task.machineId) }}</div>
              </div>
            </div>
            <div class="task-footer">
              <el-button type="primary" @click="handleStartCleaning(task)">
                <el-icon><VideoPlay /></el-icon> 开始清理
              </el-button>
            </div>
          </div>
          
          <div v-if="pendingTasks.length === 0" class="empty-state">
            <el-icon :size="64" color="#67c23a"><CircleCheck /></el-icon>
            <p>暂无待清理任务</p>
          </div>
        </div>
      </el-tab-pane>
      
      <!-- 清理中任务 -->
      <el-tab-pane label="清理中" name="processing">
        <div class="task-grid">
          <div
            v-for="task in processingTasks"
            :key="task.id"
            class="task-card processing"
          >
            <div class="task-header">
              <el-tag type="primary" effect="dark">清理中</el-tag>
              <span class="task-time">{{ formatTime(task.startedAt) }}</span>
            </div>
            <div class="task-body">
              <div class="machine-info">
                <el-icon :size="32"><Monitor /></el-icon>
                <div class="machine-id">{{ task.machineId }}</div>
                <div class="machine-area">{{ getMachineArea(task.machineId) }}</div>
              </div>
              <div class="cleaner-info">
                <el-icon><User /></el-icon>
                <span>{{ task.cleanerId || '未分配' }}</span>
              </div>
            </div>
            <div class="task-footer">
              <el-button type="success" @click="handleCompleteCleaning(task)">
                <el-icon><CircleCheck /></el-icon> 清理完成
              </el-button>
            </div>
          </div>
          
          <div v-if="processingTasks.length === 0" class="empty-state">
            <el-icon :size="64" color="#909399"><InfoFilled /></el-icon>
            <p>暂无清理中的任务</p>
          </div>
        </div>
      </el-tab-pane>
      
      <!-- 已完成任务 -->
      <el-tab-pane label="已完成" name="completed">
        <el-table :data="completedTasks" stripe>
          <el-table-column prop="id" label="任务ID" width="80" />
          <el-table-column prop="machineId" label="机器" width="100">
            <template #default="{ row }">
              <el-tag>{{ row.machineId }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="area" label="区域" width="100">
            <template #default="{ row }">
              {{ getMachineArea(row.machineId) }}
            </template>
          </el-table-column>
          <el-table-column prop="cleanerId" label="保洁员" width="100" />
          <el-table-column prop="startedAt" label="开始时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.startedAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="completedAt" label="完成时间" width="180">
            <template #default="{ row }">
              {{ formatTime(row.completedAt) }}
            </template>
          </el-table-column>
          <el-table-column prop="duration" label="用时" width="100">
            <template #default="{ row }">
              {{ row.duration ? `${row.duration}秒` : '-' }}
            </template>
          </el-table-column>
          <el-table-column label="状态" width="100">
            <template #default>
              <el-tag type="success">已完成</el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Brush, Loading, CircleCheck, Monitor, VideoPlay, InfoFilled, User } from '@element-plus/icons-vue'
import { useMachineStore } from '@/stores/machine'
import { machineApi } from '@/api/machine'
import dayjs from 'dayjs'

const machineStore = useMachineStore()
const activeTab = ref('pending')

// 从机器数据中获取待清理和清理中的任务
const cleaningTasks = computed(() => {
  const tasks: any[] = []
  let id = 1
  
  machineStore.machines.forEach(machine => {
    if (machine.status === 'dirty') {
      tasks.push({
        id: id++,
        machineId: machine.id,
        status: 'pending',
        createdAt: machine.updatedAt || new Date().toISOString(),
      })
    } else if (machine.status === 'cleaning') {
      tasks.push({
        id: id++,
        machineId: machine.id,
        status: 'in_progress',
        cleanerId: '当前保洁员',
        startedAt: machine.updatedAt || new Date().toISOString(),
      })
    }
  })
  
  return tasks
})

// 已完成任务（模拟数据）
const completedTasks = ref([
  { id: 101, machineId: 'A-03', cleanerId: '保洁员1', startedAt: new Date(Date.now() - 600000).toISOString(), completedAt: new Date(Date.now() - 300000).toISOString(), duration: 180 },
  { id: 102, machineId: 'B-01', cleanerId: '保洁员2', startedAt: new Date(Date.now() - 900000).toISOString(), completedAt: new Date(Date.now() - 600000).toISOString(), duration: 240 },
])

// 待清理任务
const pendingTasks = computed(() => 
  cleaningTasks.value.filter(t => t.status === 'pending')
)

// 清理中任务
const processingTasks = computed(() => 
  cleaningTasks.value.filter(t => t.status === 'in_progress')
)

// 获取机器区域
const getMachineArea = (machineId: string) => {
  const machine = machineStore.machines.find(m => m.id === machineId)
  if (!machine) return '未知'
  const area = machineStore.areas.find(a => a.id === machine.areaId)
  return area?.name || '未知'
}

// 格式化时间
const formatTime = (time: string | undefined) => {
  if (!time) return '-'
  return dayjs(time).format('HH:mm:ss')
}

// 开始清理
const handleStartCleaning = async (task: any) => {
  try {
    await machineApi.updateStatus(task.machineId, 'cleaning')
    await machineStore.fetchMachines()
    ElMessage.success(`已开始清理 ${task.machineId}`)
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

// 完成清理
const handleCompleteCleaning = async (task: any) => {
  try {
    await machineApi.updateStatus(task.machineId, 'offline')
    await machineStore.fetchMachines()
    
    // 添加到已完成列表
    completedTasks.value.unshift({
      id: Date.now(),
      machineId: task.machineId,
      cleanerId: task.cleanerId || '当前保洁员',
      startedAt: task.startedAt,
      completedAt: new Date().toISOString(),
      duration: task.startedAt ? Math.floor((Date.now() - new Date(task.startedAt).getTime()) / 1000) : 0,
    })
    
    ElMessage.success(`${task.machineId} 清理完成`)
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

onMounted(async () => {
  await machineStore.fetchMachines()
  await machineStore.fetchAreas()
})
</script>

<style scoped lang="scss">
.cleaning-container {
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
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
      }
      
      &.pending .stat-icon { background: linear-gradient(135deg, #e6a23c, #ebb563); }
      &.processing .stat-icon { background: linear-gradient(135deg, #409eff, #66b1ff); }
      &.completed .stat-icon { background: linear-gradient(135deg, #67c23a, #85ce61); }
      
      .stat-content {
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
  
  .task-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 16px;
    min-height: 200px;
    
    .task-card {
      background: #fff;
      border-radius: 12px;
      padding: 16px;
      border: 2px solid #e4e7ed;
      transition: all 0.3s;
      
      &.pending {
        border-color: #e6a23c;
        background: linear-gradient(135deg, #fdf6ec, #fff);
      }
      
      &.processing {
        border-color: #409eff;
        background: linear-gradient(135deg, #ecf5ff, #fff);
        animation: processing-pulse 2s infinite;
      }
      
      .task-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        
        .task-time {
          font-size: 12px;
          color: #909399;
        }
      }
      
      .task-body {
        .machine-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 20px 0;
          
          .el-icon {
            color: #606266;
          }
          
          .machine-id {
            font-size: 24px;
            font-weight: bold;
            color: #303133;
          }
          
          .machine-area {
            font-size: 14px;
            color: #909399;
          }
        }
        
        .cleaner-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px;
          background: #f5f7fa;
          border-radius: 4px;
          margin-top: 8px;
          
          .el-icon {
            color: #409eff;
          }
          
          span {
            font-size: 14px;
            color: #606266;
          }
        }
      }
      
      .task-footer {
        margin-top: 16px;
        
        .el-button {
          width: 100%;
        }
      }
    }
    
    .empty-state {
      grid-column: 1 / -1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #909399;
      
      p {
        margin-top: 16px;
        font-size: 16px;
      }
    }
  }
}

@keyframes processing-pulse {
  0%, 100% {
    box-shadow: 0 0 0 0 rgba(64, 158, 255, 0.2);
  }
  50% {
    box-shadow: 0 0 0 8px rgba(64, 158, 255, 0);
  }
}
</style>
