<template>
  <div class="dashboard-container">
    <p v-if="revenueError" class="dashboard-note" role="alert">{{ revenueError }}</p>
    <!-- 顶部卡片 -->
    <el-row :gutter="20" class="stat-cards">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: #536953">
            <el-icon :size="28"><Monitor /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.online }}/{{ stats.total }}</div>
            <div class="stat-label">在线/总数</div>
          </div>
        </div>
      </el-col>

      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: #6e8566">
            <el-icon :size="28"><Money /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">¥{{ todayRevenue }}</div>
            <div class="stat-label">今日营收</div>
          </div>
        </div>
      </el-col>

      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: #a48b55">
            <el-icon :size="28"><User /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ todayVisitors }}</div>
            <div class="stat-label">今日人次</div>
          </div>
        </div>
      </el-col>

      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon" style="background: #a65c4a">
            <el-icon :size="28"><Warning /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ faultCount }}</div>
            <div class="stat-label">待处理故障</div>
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
              <el-radio-button value="week">本周</el-radio-button>
              <el-radio-button value="month">本月</el-radio-button>
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
              <el-icon :size="48" color="#6e8566"><CircleCheck /></el-icon>
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
import type { TagProps } from 'element-plus'
import { ref, computed, onMounted, watch } from 'vue'
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
import { Monitor, Money, User, Warning, CircleClose, InfoFilled, CircleCheck } from '@element-plus/icons-vue'
import dayjs from 'dayjs'
import { analyticsApi, type Overview } from '@/api/analytics'

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
const todayOverview = ref<Overview | null>(null)
const trendOverview = ref<Overview | null>(null)
const revenueError = ref('')
const todayRevenue = computed(() => todayOverview.value ? Number(todayOverview.value.revenue).toFixed(2) : '—')
const todayVisitors = computed(() => todayOverview.value?.sessions ?? '—')
let revenueRequest = 0
async function loadRevenue() {
  const request = ++revenueRequest
  const today = dayjs().format('YYYY-MM-DD')
  const from = dayjs().subtract(revenuePeriod.value === 'month' ? 29 : 6, 'day').format('YYYY-MM-DD')
  try {
    const [current, trend] = await Promise.all([analyticsApi.getOverview({ from: today, to: today }), analyticsApi.getOverview({ from, to: today })])
    if (request !== revenueRequest) return
    todayOverview.value = current
    trendOverview.value = trend
    revenueError.value = ''
  } catch {
    if (request === revenueRequest) revenueError.value = '经营数据暂未加载，请稍后刷新页面。'
  }
}
watch(revenuePeriod, loadRevenue)
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
    data: (trendOverview.value?.revenueByDay || []).map(day => day.date.slice(5)),
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
      data: (trendOverview.value?.revenueByDay || []).map(day => day.revenue),
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(83, 105, 83, 0.2)' },
            { offset: 1, color: 'rgba(83, 105, 83, 0.02)' },
          ],
        },
      },
      itemStyle: {
        color: '#536953',
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
        borderRadius: 3,
        borderColor: '#faf7ef',
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
        { value: stats.value.online, name: '使用中', itemStyle: { color: '#6e8566' } },
        { value: stats.value.offline, name: '空闲', itemStyle: { color: '#7c8071' } },
        { value: stats.value.fault, name: '故障', itemStyle: { color: '#a65c4a' } },
        { value: stats.value.dirty, name: '待清理', itemStyle: { color: '#a48b55' } },
        { value: stats.value.cleaning, name: '清理中', itemStyle: { color: '#b6a57a' } },
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
  const map: Record<string, TagProps['type']> = {
    P0: 'danger',
    P1: 'warning',
    P2: 'info',
    P3: 'info',
  }
  return map[priority] || 'info'
}

const getAreaColor = (rate: number) => {
  if (rate >= 80) return '#6e8566'
  if (rate >= 50) return '#536953'
  if (rate >= 30) return '#a48b55'
  return '#a65c4a'
}

const formatTime = (time: string) => {
  return dayjs(time).format('HH:mm:ss')
}

onMounted(() => {
  loadRevenue()
  machineStore.fetchMachines()
  faultStore.fetchTickets()
})
</script>

<style scoped lang="scss">
.dashboard-note { font-size:12px;color:var(--cinnabar);margin:0 0 16px;line-height:1.8; }

.dashboard-container {
  .stat-cards {
    margin-bottom: 20px;

    .stat-card {
      background: var(--paper-light);
      padding: 19px 18px;
      min-height:108px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      gap: 12px;
      box-shadow: none;

      .stat-icon {
        width: 56px;
        height: 56px;
        border-radius: 3px;
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
          color: #292f29;
        }

        .stat-label {
          font-size: 12px;
          white-space: nowrap;
          color: #7c8071;
          margin-top: 7px;
        }
      }

      .stat-trend {
        .trend-up {
          color: #6e8566;
          font-size: 14px;
        }

        .trend-down {
          color: #a65c4a;
          font-size: 14px;
        }
      }
    }
  }

  .chart-row {
    margin-bottom: 20px;
  }

  .chart-card {
    background: var(--paper-light);
    padding: 20px;
    border-radius: 3px;
    box-shadow: none;

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;

      h3 {
        font-size: 16px;
        color: #292f29;
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
      background: var(--paper-light);
      padding: 20px;
      border-radius: 3px;
      box-shadow: none;

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;

        h3 {
          font-size: 16px;
          color: #292f29;
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
        border-radius: 3px;
        border-left: 4px solid;

        &.p0 {
          background: #f1e4dc;
          border-color: #a65c4a;
        }

        &.p1 {
          background: #f0eadb;
          border-color: #a48b55;
        }

        &.p2 {
          background: #e9eee2;
          border-color: #536953;
        }

        &.p3 {
          background: #eeece3;
          border-color: #7c8071;
        }

        .alert-content {
          flex: 1;

          .alert-title {
            font-size: 14px;
            color: #292f29;
          }

          .alert-time {
            font-size: 12px;
            color: #7c8071;
            margin-top: 4px;
          }
        }
      }

      .no-alerts {
        text-align: center;
        padding: 40px;
        color: #7c8071;

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
            color: #292f29;
          }

          .area-detail {
            font-size: 14px;
            color: #7c8071;
          }
        }
      }
    }
  }
}
</style>
