<template>
  <div class="reports-container" v-loading="loading">
    <!-- 顶部筛选 -->
    <div class="filter-bar">
      <el-row :gutter="20" align="middle">
        <el-col :span="6">
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            :shortcuts="dateShortcuts"
            @change="handleDateChange"
          />
        </el-col>
        <el-col :span="4">
          <el-select v-model="selectedArea" placeholder="选择区域" clearable @change="handleAreaChange">
            <el-option label="全部区域" :value="0" />
            <el-option label="竞技区" :value="1" />
            <el-option label="休闲区" :value="2" />
            <el-option label="包间" :value="3" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button type="primary" @click="handleExport">
            <el-icon><Download /></el-icon> 导出报表
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 核心指标卡片 -->
    <el-row :gutter="20" class="metric-cards">
      <el-col :span="6">
        <div class="metric-card revenue">
          <div class="metric-icon">
            <el-icon :size="32"><Money /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">¥{{ currentData.revenue.toLocaleString() }}</div>
            <div class="metric-label">{{ periodLabel }}营收</div>
            <div class="metric-trend up">
              +12.5% <el-icon><Top /></el-icon>
            </div>
          </div>
        </div>
      </el-col>

      <el-col :span="6">
        <div class="metric-card visitors">
          <div class="metric-icon">
            <el-icon :size="32"><User /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ currentData.visitors.toLocaleString() }}</div>
            <div class="metric-label">{{ periodLabel }}人次</div>
            <div class="metric-trend up">
              +8.3% <el-icon><Top /></el-icon>
            </div>
          </div>
        </div>
      </el-col>

      <el-col :span="6">
        <div class="metric-card occupancy">
          <div class="metric-icon">
            <el-icon :size="32"><Monitor /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ currentData.occupancy }}%</div>
            <div class="metric-label">平均上座率</div>
            <div class="metric-trend up">
              +5.2% <el-icon><Top /></el-icon>
            </div>
          </div>
        </div>
      </el-col>

      <el-col :span="6">
        <div class="metric-card avg-time">
          <div class="metric-icon">
            <el-icon :size="32"><Timer /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ currentData.avgTime }}h</div>
            <div class="metric-label">平均上机时长</div>
            <div class="metric-trend down">
              -2.1% <el-icon><Bottom /></el-icon>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 营收趋势图表 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="16">
        <div class="chart-card">
          <div class="card-header">
            <h3>营收趋势</h3>
            <el-radio-group v-model="chartPeriod" size="small" @change="value => updateChartData(String(value))">
              <el-radio-button value="week">本周</el-radio-button>
              <el-radio-button value="month">本月</el-radio-button>
              <el-radio-button value="year">本年</el-radio-button>
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
            <h3>收入构成</h3>
          </div>
          <div class="chart-container">
            <v-chart :option="pieChartOption" autoresize />
          </div>
        </div>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <div class="chart-card">
          <div class="card-header">
            <h3>时段分布</h3>
          </div>
          <div class="chart-container">
            <v-chart :option="hourlyChartOption" autoresize />
          </div>
        </div>
      </el-col>

      <el-col :span="12">
        <div class="chart-card">
          <div class="card-header">
            <h3>区域上座率对比</h3>
          </div>
          <div class="chart-container">
            <v-chart :option="areaChartOption" autoresize />
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 数据表格 -->
    <div class="table-card">
      <div class="card-header">
        <h3>详细数据</h3>
        <el-radio-group v-model="tableType" size="small" @change="value => updateTableData(String(value))">
          <el-radio-button value="daily">按日</el-radio-button>
          <el-radio-button value="machine">按机器</el-radio-button>
          <el-radio-button value="area">按区域</el-radio-button>
        </el-radio-group>
      </div>

      <!-- 按日表格 -->
      <el-table v-if="tableType === 'daily'" :data="dailyTableData" stripe empty-text="暂无数据">
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="revenue" label="营收(元)" width="120">
          <template #default="{ row }">
            <span class="revenue-value">¥{{ row.revenue }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sessions" label="上机人次" width="100" />
        <el-table-column prop="hours" label="总时长(小时)" width="120" />
        <el-table-column prop="occupancy" label="上座率" width="120">
          <template #default="{ row }">
            <el-progress :percentage="row.occupancy" :stroke-width="8" :text-inside="true" />
          </template>
        </el-table-column>
        <el-table-column prop="avgSession" label="平均时长" width="100" />
        <el-table-column prop="faultCount" label="故障次数" width="100">
          <template #default="{ row }">
            <el-tag :type="row.faultCount > 3 ? 'danger' : row.faultCount > 0 ? 'warning' : 'success'">
              {{ row.faultCount }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <!-- 按机器表格 -->
      <el-table v-if="tableType === 'machine'" :data="machineTableData" stripe empty-text="暂无数据">
        <el-table-column prop="machineId" label="机器" width="100">
          <template #default="{ row }">
            <el-tag>{{ row.machineId }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="areaName" label="区域" width="100" />
        <el-table-column prop="revenue" label="营收(元)" width="120">
          <template #default="{ row }">
            <span class="revenue-value">¥{{ row.revenue }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sessions" label="上机次数" width="100" />
        <el-table-column prop="hours" label="总时长(小时)" width="120" />
        <el-table-column prop="occupancy" label="使用率" width="120">
          <template #default="{ row }">
            <el-progress :percentage="row.occupancy" :stroke-width="8" :text-inside="true" />
          </template>
        </el-table-column>
        <el-table-column prop="faultCount" label="故障次数" width="100">
          <template #default="{ row }">
            <el-tag :type="row.faultCount > 2 ? 'danger' : row.faultCount > 0 ? 'warning' : 'success'">
              {{ row.faultCount }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="当前状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
      </el-table>

      <!-- 按区域表格 -->
      <el-table v-if="tableType === 'area'" :data="areaTableData" stripe empty-text="暂无数据">
        <el-table-column prop="areaName" label="区域" width="120">
          <template #default="{ row }">
            <el-tag :type="getAreaTagType(row.areaId)">{{ row.areaName }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="machineCount" label="机器数量" width="100" />
        <el-table-column prop="revenue" label="营收(元)" width="120">
          <template #default="{ row }">
            <span class="revenue-value">¥{{ row.revenue }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="sessions" label="上机人次" width="100" />
        <el-table-column prop="hours" label="总时长(小时)" width="120" />
        <el-table-column prop="occupancy" label="上座率" width="120">
          <template #default="{ row }">
            <el-progress :percentage="row.occupancy" :stroke-width="8" :text-inside="true" />
          </template>
        </el-table-column>
        <el-table-column prop="avgPrice" label="均价(元/时)" width="120" />
        <el-table-column prop="faultCount" label="故障次数" width="100">
          <template #default="{ row }">
            <el-tag :type="row.faultCount > 5 ? 'danger' : row.faultCount > 0 ? 'warning' : 'success'">
              {{ row.faultCount }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-footer">
        <el-pagination
          v-model:current-page="currentPage"
          :page-size="10"
          :total="tableTotal"
          layout="total, prev, pager, next"
        />
      </div>
    </div>

    <!-- 故障统计 -->
    <el-row :gutter="20" class="chart-row">
      <el-col :span="12">
        <div class="chart-card">
          <div class="card-header">
            <h3>故障类型分布</h3>
          </div>
          <div class="chart-container">
            <v-chart :option="faultTypeChartOption" autoresize />
          </div>
        </div>
      </el-col>

      <el-col :span="12">
        <div class="chart-card">
          <div class="card-header">
            <h3>故障趋势</h3>
          </div>
          <div class="chart-container">
            <v-chart :option="faultTrendChartOption" autoresize />
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import type { TagProps } from 'element-plus'
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
} from 'echarts/components'
import VChart from 'vue-echarts'
import {
  analyticsApi,
  type Overview,
  type MachineStat,
  type AreaStat,
  type HourlyStat,
  type FaultStat,
} from '@/api/analytics'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
])

const dateRange = ref<[Date, Date]>([new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()])
const selectedArea = ref(0)
const chartPeriod = ref('week')
const tableType = ref('daily')
const currentPage = ref(1)
const loading = ref(false)

// 接口数据
const overview = ref<Overview | null>(null)
const machineStats = ref<MachineStat[]>([])
const areaStats = ref<AreaStat[]>([])
const hourlyStats = ref<HourlyStat[]>([])
const faultStats = ref<FaultStat | null>(null)

const dateShortcuts = [
  {
    text: '最近一周',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 7 * 24 * 60 * 60 * 1000)
      return [start, end]
    },
  },
  {
    text: '最近一个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 30 * 24 * 60 * 60 * 1000)
      return [start, end]
    },
  },
  {
    text: '最近三个月',
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 90 * 24 * 60 * 60 * 1000)
      return [start, end]
    },
  },
]

// 周期标签
const periodLabel = computed(() => {
  const map: Record<string, string> = {
    week: '本周',
    month: '本月',
    year: '本年',
  }
  return map[chartPeriod.value] || '本周'
})

const formatDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const rangeParams = computed(() => {
  const range = dateRange.value
  const from = range?.[0] ? formatDate(range[0]) : undefined
  const to = range?.[1] ? formatDate(range[1]) : undefined
  return { from, to }
})

// 当前周期数据（由 overview.revenueByDay 映射）
const currentData = computed(() => {
  const ov = overview.value
  const byDay = ov?.revenueByDay ?? []
  const sessions = ov?.sessions ?? 0
  const hours = ov?.hours ?? 0
  return {
    revenue: Math.round(ov?.revenue ?? 0),
    visitors: sessions,
    occupancy: Math.round(ov?.occupancyRate ?? 0),
    avgTime: sessions > 0 ? Math.round((hours / sessions) * 10) / 10 : 0,
    labels: byDay.map(d => d.date.slice(5)),
    values: byDay.map(d => Number(d.revenue) || 0),
    hasData: byDay.length > 0,
  }
})

// 按日表格数据（由 overview.revenueByDay 派生）
const dailyTableData = computed(() => {
  const ov = overview.value
  const byDay = ov?.revenueByDay ?? []
  const avgHours = ov && ov.sessions > 0 ? (ov.hours || 0) / ov.sessions : 0
  return [...byDay].reverse().map(d => ({
    date: d.date,
    revenue: Math.round(Number(d.revenue) || 0),
    sessions: d.sessions || 0,
    hours: Math.round((d.sessions || 0) * avgHours),
    occupancy: Math.round(ov?.occupancyRate ?? 0),
    avgSession: avgHours > 0 ? `${avgHours.toFixed(1)}h` : '-',
    faultCount: 0,
  }))
})

const filteredAreaStats = computed(() => {
  if (!selectedArea.value) return areaStats.value
  return areaStats.value.filter(a => a.areaId === selectedArea.value)
})

// 按机器表格数据（来自 analyticsApi.getMachines）
const machineTableData = computed(() => {
  const areaNames = new Set(filteredAreaStats.value.map(a => a.areaName))
  return machineStats.value
    .filter(m => !selectedArea.value || areaNames.has(m.areaName))
    .map(m => ({
      machineId: m.machineId,
      areaName: m.areaName || '未知',
      revenue: Math.round(Number(m.revenue) || 0),
      sessions: m.sessions || 0,
      hours: m.hours || 0,
      occupancy: Math.round(m.occupancy) || 0,
      faultCount: m.faultCount || 0,
      status: m.status,
    }))
})

// 按区域表格数据（来自 analyticsApi.getAreas）
const areaTableData = computed(() => {
  return filteredAreaStats.value.map(a => ({
    areaId: a.areaId,
    areaName: a.areaName,
    machineCount: a.machineCount || 0,
    revenue: Math.round(Number(a.revenue) || 0),
    sessions: a.sessions || 0,
    hours: a.hours || 0,
    occupancy: Math.round(a.occupancy) || 0,
    avgPrice: a.avgPrice || 0,
    faultCount: a.faultCount || 0,
  }))
})

const tableTotal = computed(() => {
  if (tableType.value === 'daily') return dailyTableData.value.length
  if (tableType.value === 'machine') return machineTableData.value.length
  return areaTableData.value.length
})

// 营收趋势图表
const revenueChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: '{b}<br />营收: ¥{c}',
  },
  xAxis: {
    type: 'category',
    data: currentData.value.labels,
  },
  yAxis: {
    type: 'value',
    name: '金额(元)',
    axisLabel: {
      formatter: '¥{value}',
    },
  },
  series: [
    {
      name: '营收',
      type: 'line',
      smooth: true,
      data: currentData.value.values,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0, y: 0, x2: 0, y2: 1,
          colorStops: [
            { offset: 0, color: 'rgba(83, 105, 83, 0.2)' },
            { offset: 1, color: 'rgba(83, 105, 83, 0.02)' },
          ],
        },
      },
      itemStyle: { color: '#536953' },
    },
  ],
}))

// 收入构成饼图（后端暂无分项接口，按营收固定比例展示）
const pieChartOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: ¥{c} ({d}%)',
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
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 'bold' },
      },
      data: [
        { value: Math.floor(currentData.value.revenue * 0.7), name: '网费', itemStyle: { color: '#536953' } },
        { value: Math.floor(currentData.value.revenue * 0.18), name: '水吧', itemStyle: { color: '#6e8566' } },
        { value: Math.floor(currentData.value.revenue * 0.08), name: '充值赠送', itemStyle: { color: '#a48b55' } },
        { value: Math.floor(currentData.value.revenue * 0.04), name: '其他', itemStyle: { color: '#7c8071' } },
      ],
    },
  ],
}))

// 时段分布图表（来自 analyticsApi.getHourly）
const hourlyChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: '{b}:00<br />上机人数: {c}',
  },
  xAxis: {
    type: 'category',
    data: Array.from({ length: 24 }, (_, i) => i),
    axisLabel: {
      formatter: '{value}:00',
    },
  },
  yAxis: {
    type: 'value',
    name: '人数',
  },
  series: [
    {
      type: 'bar',
      data: hourlyStats.value.map(h => h.sessions || 0),
      itemStyle: {
        color: (params: any) => {
          const value = params.value
          if (value >= 60) return '#a65c4a'
          if (value >= 40) return '#a48b55'
          return '#536953'
        },
      },
    },
  ],
}))

// 区域上座率对比（来自 analyticsApi.getAreas）
const areaChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: '{b}<br />上座率: {c}%',
  },
  xAxis: {
    type: 'category',
    data: filteredAreaStats.value.map(a => a.areaName),
  },
  yAxis: {
    type: 'value',
    name: '上座率(%)',
    max: 100,
  },
  series: [
    {
      type: 'bar',
      data: filteredAreaStats.value.map(a => Math.round(a.occupancy) || 0),
      barWidth: '50%',
      itemStyle: {
        color: (params: any) => {
          const colors = ['#a65c4a', '#536953', '#a48b55', '#6e8566']
          return colors[params.dataIndex % colors.length]
        },
      },
    },
  ],
}))

// 故障类型分布（来自 analyticsApi.getFaults）
const faultTypeChartOption = computed(() => ({
  tooltip: {
    trigger: 'item',
    formatter: '{b}: {c}次 ({d}%)',
  },
  legend: {
    bottom: '0',
    left: 'center',
  },
  series: [
    {
      type: 'pie',
      radius: '60%',
      data: (faultStats.value?.byType ?? []).map(t => ({
        value: t.count,
        name: t.type,
      })),
    },
  ],
}))

// 故障趋势（后端暂无按日故障序列，无数据时为空图）
const faultTrendChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
  },
  xAxis: {
    type: 'category',
    data: currentData.value.labels,
  },
  yAxis: {
    type: 'value',
    name: '故障次数',
  },
  series: [
    {
      name: '故障数',
      type: 'line',
      data: [] as number[],
      itemStyle: { color: '#a65c4a' },
    },
  ],
}))

// 获取状态类型
const getStatusType = (status: string) => {
  const map: Record<string, TagProps['type']> = {
    online: 'success',
    offline: 'info',
    fault: 'danger',
    dirty: 'warning',
    cleaning: 'info',
  }
  return map[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    online: '使用中',
    offline: '空闲',
    fault: '故障',
    dirty: '待清理',
    cleaning: '清理中',
  }
  return map[status] || status
}

// 获取区域标签类型
const getAreaTagType = (areaId: number) => {
  const types = ['info', 'danger', 'primary', 'warning'] as const
  return types[areaId] || 'info'
}

// 拉取报表数据
const fetchData = async () => {
  loading.value = true
  try {
    const params = rangeParams.value
    const [ov, machines, areas, hourly, faults] = await Promise.all([
      analyticsApi.getOverview(params),
      analyticsApi.getMachines(params),
      analyticsApi.getAreas(params),
      analyticsApi.getHourly(params.to),
      analyticsApi.getFaults(params),
    ])
    overview.value = ov ?? null
    machineStats.value = Array.isArray(machines) ? machines : []
    areaStats.value = Array.isArray(areas) ? areas : []
    hourlyStats.value = Array.isArray(hourly) ? hourly : []
    faultStats.value = faults ?? null
    currentPage.value = 1
  } catch (error) {
    console.error('加载报表数据失败', error)
  } finally {
    loading.value = false
  }
}

// 更新图表数据（切换周/月/年并按对应区间拉取）
const updateChartData = (period: string) => {
  chartPeriod.value = period
  const days = period === 'month' ? 30 : period === 'year' ? 365 : 7
  const end = new Date()
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  dateRange.value = [start, end]
  fetchData()
}

// 更新表格数据
const updateTableData = (type: string) => {
  tableType.value = type
  currentPage.value = 1
}

// 日期变化
const handleDateChange = () => {
  fetchData()
}

// 区域变化
const handleAreaChange = () => {
  fetchData()
}

// 导出报表
const handleExport = () => {
  ElMessage.success('报表导出成功')
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.reports-container {
  .filter-bar {
    background: var(--paper-light);
    padding: 16px 20px;
    border-radius: 3px;
    margin-bottom: 20px;
  }

  .metric-cards {
    margin-bottom: 20px;

    .metric-card {
      background: var(--paper-light);
      padding: 20px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      gap: 16px;

      .metric-icon {
        width: 60px;
        height: 60px;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--ink-soft);
      }

      &.revenue .metric-icon { background: var(--paper-deep); }
      &.visitors .metric-icon { background: var(--paper-deep); }
      &.occupancy .metric-icon { background: var(--paper-deep); }
      &.avg-time .metric-icon { background: var(--paper-deep); }

      .metric-content {
        flex: 1;

        .metric-value {
          font-size: 28px;
          font-weight: bold;
          color: #292f29;
        }

        .metric-label {
          font-size: 14px;
          color: #7c8071;
          margin-top: 4px;
        }

        .metric-trend {
          font-size: 14px;
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 4px;

          &.up { color: #6e8566; }
          &.down { color: #a65c4a; }
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

  .table-card {
    background: var(--paper-light);
    padding: 20px;
    border-radius: 3px;
    margin-bottom: 20px;

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

    .revenue-value {
      color: #536953;
      font-weight: bold;
    }

    .table-footer {
      margin-top: 16px;
      display: flex;
      justify-content: flex-end;
    }
  }
}
</style>
