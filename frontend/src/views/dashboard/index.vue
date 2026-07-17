<template>
  <div class="dashboard-container">
    <!-- 顶部卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #409eff, #66b1ff)">
            <el-icon :size="28"><Monitor /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.online }}/{{ stats.total }}</div>
            <div class="stat-label">在线/总数</div>
          </div>
          <div class="stat-trend">
            <span class="trend-up">+12%</span>
          </div>
        </div>
      </el-col>
      
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #67c23a, #85ce61)">
            <el-icon :size="28"><Money /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">¥{{ todayRevenue }}</div>
            <div class="stat-label">今日营收</div>
          </div>
          <div class="stat-trend">
            <span class="trend-up">+8%</span>
          </div>
        </div>
      </el-col>
      
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #e6a23c, #ebb563)">
            <el-icon :size="28"><User /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ todayVisitors }}</div>
            <div class="stat-label">今日人次</div>
          </div>
          <div class="stat-trend">
            <span class="trend-down">-3%</span>
          </div>
        </div>
      </el-col>
      
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: linear-gradient(135deg, #f56c6c, #f89898)">
            <el-icon :size="28"><Warning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ faultCount }}</div>
            <div class="stat-label">待处理故障</div>
          </div>
          <div class="stat-trend">
            <span class="trend-down">-2</span>
          </div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 图表区域 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="16">
        <div class="chart-card">
          <div class="card-header">
            <h3>营收趋势</h3>
            <el-radio-group v-model="revenuePeriod" size="small">
              <el-radio-button label="week">本周</el-radio-button>
              <el-radio-button label="month">本月</el-radio-button>
            </el-radio-group>
          </div>
          <div class="chart-container">
            <v-chart :option="revenueChartOption" autoresize />
          </div>
        </div>
      </el-col>
      
      <el-col :span="8">
        <div class="chart-card">
          <div class="card-header">
            <h3>机器状态分布</h3>
          </div>
          <div class="chart-container">
            <v-chart :option="statusChartOption" autoresize />
          </div>
        </div>
      </el-col>
    </el-row>
    
    <!-- 实时告警和热门区域 -->
    <el-row :gutter="20" class="bottom-row">
      <el-col :span="12">
        <div class="alert-panel">
          <div class="card-header">
            <h3>实时告警</h3>
            <el-button text type="primary" @click="$router.push('/faults')">
              查看全部
            </el-button>
          </div>
          <div class="alert-list">
            <div
              v-for="alert in recentAlerts"
              :key="alert.id"
              class="alert-item"
              :class="alert.priority.toLowerCase()"
            >
              <div class="alert-icon">
                <el-icon v-if="alert.priority === 'P0'" :size="20"><CircleClose /></el-icon>
                <el-icon v-else-if="alert.priority === 'P1'" :size="20"><Warning /></el-icon>
                <el-icon v-else :size="20"><InfoFilled /></el-icon>
              </div>
              <div class="alert-content">
                <div class="alert-title">
                  {{ alert.machineId }} - {{ getFaultTypeName(alert.faultType) }}
                </div>
                <div class="alert-time">{{ formatTime(alert.createdAt) }}</div>
              </div>
              <el-tag :type="getPriorityType(alert.priority)" size="small" effect="dark">
                {{ alert.priority }}
              </el-tag>
            </div>
            
            <div v-if="recentAlerts.length === 0" class="no-alerts">
              <el-icon :size="48" color="#67c23a"><CircleCheck /></el-icon>
              <p>暂无告警</p>
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :span="12">
        <div class="area-panel">
          <div class="card-header">
            <h3>区域上座率</h3>
          </div>
          <div class="area-list">
            <div
              v-for="area in areaStats"
              :key="area.id"
              class="area-item"
            >
              <div class="area-info">
                <div class="area-name">{{ area.name }}</div>
                <div class="area-detail">
                  {{ area.online }}/{{ area.total }} 台
                </div>
              </div>
              <el-progress
                :percentage="area.rate"
                :color="getAreaColor(area.rate)"
                :stroke-width="20"
              />
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import { useMachineStore } from '@/stores/machine'
import { useFaultStore } from '@/stores/fault'
import dayjs from 'dayjs'

use([
  CanvasRenderer,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

const machineStore = useMachineStore()
const faultStore = useFaultStore()

const revenuePeriod = ref('week')

// 统计数据
const stats = computed(() => machineStore.stats)
const todayRevenue = ref(3580)
const todayVisitors = ref(128)
const faultCount = computed(() => faultStore.pendingTickets.length)

// 最近告警
const recentAlerts = computed(() => faultStore.tickets.slice(0, 5))

// 区域统计
const areaStats = computed(() => {
  return machineStore.areas.map(area => {
    const areaMachines = machineStore.machines.filter(m => m.areaId === area.id)
    const online = areaMachines.filter(m => m.status === 'online').length
    const total = areaMachines.length
    return {
      id: area.id,
      name: area.name,
      online,
      total,
      rate: total > 0 ? Math.round((online / total) * 100) : 0,
    }
  })
})

// 营收图表配置
const revenueChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
  },
  xAxis: {
    type: 'category',
    data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  },
  yAxis: {
    type: 'value',
    name: '金额(元)',
  },
  series: [
    {
      name: '营收',
      type: 'line',
      smooth: true,
      data: [2800, 3200, 2900, 3500, 3800, 4200, 3580],
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' },
          ],
        },
      },
      itemStyle: {
        color: '#409eff',
      },
    },
  ],
}))

// 状态分布图表配置
const statusChartOption = computed(() => ({
  tooltip: {
    trigger: 'item',
  },
  legend: {
    bottom: '0',
    left: 'center',
  },
  series: [
    {
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2,
      },
      label: {
        show: false,
      },
      emphasis: {
        label: {
          show: true,
          fontSize: 14,
          fontWeight: 'bold',
        },
      },
      data: [
        { value: stats.value.online, name: '使用中', itemStyle: { color: '#67c23a' } },
        { value: stats.value.offline, name: '空闲', itemStyle: { color: '#909399' } },
        { value: stats.value.fault, name: '故障', itemStyle: { color: '#f56c6c' } },
        { value: stats.value.dirty, name: '待清理', itemStyle: { color: '#e6a23c' } },
      ],
    },
  ],
}))

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
  }
  return map[type] || type
}

const getPriorityType = (priority: string) => {
  const map: Record<string, string> = {
    P0: 'danger',
    P1: 'warning',
    P2: '',
    P3: 'info',
  }
  return map[priority] || ''
}

const getAreaColor = (rate: number) => {
  if (rate >= 80) return '#67c23a'
  if (rate >= 50) return '#409eff'
  if (rate >= 30) return '#e6a23c'
  return '#f56c6c'
}

const formatTime = (time: string) => {
  return dayjs(time).format('HH:mm:ss')
}

onMounted(() => {
  machineStore.fetchMachines()
  faultStore.fetchTickets()
})
</script>

<style scoped lang="scss">
.dashboard-container {
  .stat-cards {
    margin-bottom: 20px;
    
    .stat-card {
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 16px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
      
      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
      }
      
      .stat-content {
        flex: 1;
        
        .stat-value {
          font-size: 24px;
          font-weight: bold;
          color: #303133;
        }
        
        .stat-label {
          font-size: 14px;
          color: #909399;
          margin-top: 4px;
        }
      }
      
      .stat-trend {
        .trend-up {
          color: #67c23a;
          font-size: 14px;
        }
        
        .trend-down {
          color: #f56c6c;
          font-size: 14px;
        }
      }
    }
  }
  
  .chart-row {
    margin-bottom: 20px;
  }
  
  .chart-card {
    background: #fff;
    padding: 20px;
    border-radius: 12px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      
      h3 {
        font-size: 16px;
        color: #303133;
        margin: 0;
      }
    }
    
    .chart-container {
      height: 300px;
    }
  }
  
  .bottom-row {
    .alert-panel,
    .area-panel {
      background: #fff;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
      
      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
        
        h3 {
          font-size: 16px;
          color: #303133;
          margin: 0;
        }
      }
    }
    
    .alert-list {
      .alert-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        margin-bottom: 8px;
        border-radius: 8px;
        border-left: 4px solid;
        
        &.p0 {
          background: #fef0f0;
          border-color: #f56c6c;
        }
        
        &.p1 {
          background: #fdf6ec;
          border-color: #e6a23c;
        }
        
        &.p2 {
          background: #f0f9ff;
          border-color: #409eff;
        }
        
        &.p3 {
          background: #f4f4f5;
          border-color: #909399;
        }
        
        .alert-content {
          flex: 1;
          
          .alert-title {
            font-size: 14px;
            color: #303133;
          }
          
          .alert-time {
            font-size: 12px;
            color: #909399;
            margin-top: 4px;
          }
        }
      }
      
      .no-alerts {
        text-align: center;
        padding: 40px;
        color: #909399;
        
        p {
          margin-top: 12px;
        }
      }
    }
    
    .area-list {
      .area-item {
        margin-bottom: 16px;
        
        .area-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
          
          .area-name {
            font-size: 14px;
            color: #303133;
          }
          
          .area-detail {
            font-size: 14px;
            color: #909399;
          }
        }
      }
    }
  }
}
</style>
