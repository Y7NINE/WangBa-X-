<template>
  <div class="cleaning-container" v-loading="loading">
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
              <el-button v-if="canStartCleaning(authStore.user)" type="primary" @click="handleStartCleaning(task)">
                <el-icon><VideoPlay /></el-icon> 开始清理
              </el-button>
            </div>
          </div>

          <div v-if="pendingTasks.length === 0" class="empty-state">
            <el-icon :size="64" color="#6e8566"><CircleCheck /></el-icon>
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
              <el-button v-if="canCompleteCleaning(authStore.user, task)" type="success" @click="handleCompleteCleaning(task)">
                <el-icon><CircleCheck /></el-icon> 清理完成
              </el-button>
            </div>
          </div>

          <div v-if="processingTasks.length === 0" class="empty-state">
            <el-icon :size="64" color="#7c8071"><InfoFilled /></el-icon>
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
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Brush, Loading, CircleCheck, Monitor, VideoPlay, InfoFilled, User } from '@element-plus/icons-vue'
import { useMachineStore } from '@/stores/machine'
import { useAuthStore } from '@/stores/auth'
import { canStartCleaning, canCompleteCleaning } from '@/access'
import { cleaningApi, type CleaningTask } from '@/api/cleaning'
import dayjs from 'dayjs'

const machineStore = useMachineStore()
const authStore = useAuthStore()
const activeTab = ref('pending')
const loading = ref(false)

// 保洁任务（来自 cleaning API）
const pendingTasks = ref<CleaningTask[]>([])
const processingTasks = ref<CleaningTask[]>([])
const completedTasks = ref<CleaningTask[]>([])

const loadTasks = async () => {
  loading.value = true
  try {
    const [pending, completed] = await Promise.all([
      cleaningApi.getPendingTasks(),
      cleaningApi.getCompletedTasks(),
    ])
    const active = Array.isArray(pending) ? pending : []
    pendingTasks.value = active.filter(task => task.status === 'pending')
    processingTasks.value = active.filter(task => task.status === 'in_progress')
    completedTasks.value = Array.isArray(completed) ? completed : []
  } catch (error) {
    console.error('加载保洁任务失败', error)
  } finally {
    loading.value = false
  }
}

// 获取机器区域
const getMachineArea = (machineId: string) => {
  const machine = machineStore.machines.find(m => m.id === machineId)
  if (!machine) return '未知'
  const area = machineStore.areas.find(a => a.id === machine.areaId)
  return area?.name || '未知'
}

// 格式化时间
const formatTime = (time: string | null | undefined) => {
  if (!time) return '-'
  return dayjs(time).format('HH:mm:ss')
}

// 开始清理
const handleStartCleaning = async (task: CleaningTask) => {
  try {
    const started = await cleaningApi.startCleaning(task.id)
    pendingTasks.value = pendingTasks.value.filter(t => t.id !== task.id)
    processingTasks.value.unshift(started ?? { ...task, status: 'in_progress', startedAt: new Date().toISOString() })
    await machineStore.fetchMachines()
    ElMessage.success(`已开始清理 ${task.machineId}`)
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

// 完成清理
const handleCompleteCleaning = async (task: CleaningTask) => {
  try {
    await cleaningApi.completeCleaning(task.id)
    processingTasks.value = processingTasks.value.filter(t => t.id !== task.id)
    await Promise.all([loadTasks(), machineStore.fetchMachines()])
    ElMessage.success(`${task.machineId} 清理完成`)
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

onMounted(async () => {
  await Promise.all([loadTasks(), machineStore.fetchMachines(), machineStore.fetchAreas()])
})
</script>

<style scoped lang="scss">
.cleaning-container {
  .stats-bar {
    margin-bottom: 20px;

    .stat-card {
      background: var(--paper-light);
      padding: 20px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      gap: 16px;

      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
      }

      &.pending .stat-icon { background: var(--paper-deep); }
      &.processing .stat-icon { background: var(--paper-deep); }
      &.completed .stat-icon { background: var(--paper-deep); }

      .stat-content {
        .stat-value {
          font-size: 28px;
          font-weight: bold;
          color: #292f29;
        }

        .stat-label {
          font-size: 14px;
          color: #7c8071;
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
      background: var(--paper-light);
      border-radius: 3px;
      padding: 16px;
      border: 2px solid #dcd6c8;
      transition: all 0.3s;

      &.pending {
        border-color: #a48b55;
        background: var(--paper-deep);
      }

      &.processing {
        border-color: #536953;
        background: var(--paper-deep);
        animation: processing-pulse 2s infinite;
      }

      .task-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        .task-time {
          font-size: 12px;
          color: #7c8071;
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
            color: #555e52;
          }

          .machine-id {
            font-size: 24px;
            font-weight: bold;
            color: #292f29;
          }

          .machine-area {
            font-size: 14px;
            color: #7c8071;
          }
        }

        .cleaner-info {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 8px;
          background: #f4f0e6;
          border-radius: 4px;
          margin-top: 8px;

          .el-icon {
            color: #536953;
          }

          span {
            font-size: 14px;
            color: #555e52;
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
      color: #7c8071;

      p {
        margin-top: 16px;
        font-size: 16px;
      }
    }
  }
}

@keyframes processing-pulse {
  0%, 100% {
    box-shadow: none;
  }
  50% {
    box-shadow: none;
  }
}
</style>
