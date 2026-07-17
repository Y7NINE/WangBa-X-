<template>
  <div class="reports-container">
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
            <el-radio-group v-model="chartPeriod" size="small" @change="updateChartData">
              <el-radio-button label="week">本周</el-radio-button>
              <el-radio-button label="month">本月</el-radio-button>
              <el-radio-button label="year">本年</el-radio-button>
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
        <el-radio-group v-model="tableType" size="small" @change="updateTableData">
          <el-radio-button label="daily">按日</el-radio-button>
          <el-radio-button label="machine">按机器</el-radio-button>
          <el-radio-button label="area">按区域</el-radio-button>
        </el-radio-group>
      </div>
      
      <!-- 按日表格 -->
      <el-table v-if="tableType === 'daily'" :data="dailyTableData" stripe>
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
      <el-table v-if="tableType === 'machine'" :data="machineTableData" stripe>
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
      <el-table v-if="tableType === 'area'" :data="areaTableData" stripe>
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
import { useMachineStore } from '@/stores/machine'

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

const machineStore = useMachineStore()

const dateRange = ref<[Date, Date]>([new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), new Date()])
const selectedArea = ref(0)
const chartPeriod = ref('week')
const tableType = ref('daily')
const currentPage = ref(1)
const tableTotal = ref(100)

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

// 模拟不同周期的数据
const periodData: Record<string, any> = {
  week: {
    revenue: 35680,
    visitors: 986,
    occupancy: 75,
    avgTime: 3.5,
    labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
    values: [3560, 4120, 3890, 4560, 5230, 4890, 3580],
  },
  month: {
    revenue: 145680,
    visitors: 4256,
    occupancy: 72,
    avgTime: 3.2,
    labels: ['第1周', '第2周', '第3周', '第4周'],
    values: [32500, 38200, 41300, 33680],
  },
  year: {
    revenue: 1680000,
    visitors: 48500,
    occupancy: 68,
    avgTime: 3.0,
    labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    values: [120000, 115000, 135000, 142000, 155000, 168000, 180000, 175000, 162000, 148000, 140000, 140000],
  },
}

// 当前周期数据
const currentData = computed(() => periodData[chartPeriod.value] || periodData.week)

// 按日表格数据
const dailyTableData = ref([
  { date: '2026-07-17', revenue: 3580, sessions: 128, hours: 448, occupancy: 75, avgSession: '3.5h', faultCount: 2 },
  { date: '2026-07-16', revenue: 4120, sessions: 145, hours: 507, occupancy: 82, avgSession: '3.5h', faultCount: 1 },
  { date: '2026-07-15', revenue: 3890, sessions: 136, hours: 476, occupancy: 78, avgSession: '3.5h', faultCount: 3 },
  { date: '2026-07-14', revenue: 4560, sessions: 158, hours: 553, occupancy: 85, avgSession: '3.5h', faultCount: 0 },
  { date: '2026-07-13', revenue: 5230, sessions: 178, hours: 623, occupancy: 90, avgSession: '3.5h', faultCount: 1 },
  { date: '2026-07-12', revenue: 4890, sessions: 165, hours: 577, occupancy: 87, avgSession: '3.5h', faultCount: 2 },
  { date: '2026-07-11', revenue: 3560, sessions: 125, hours: 437, occupancy: 73, avgSession: '3.5h', faultCount: 4 },
])

// 按机器表格数据
const machineTableData = computed(() => {
  return machineStore.machines.map(m => {
    const area = machineStore.areas.find(a => a.id === m.areaId)
    return {
      machineId: m.id,
      areaName: area?.name || '未知',
      revenue: Math.floor(Math.random() * 5000) + 1000,
      sessions: Math.floor(Math.random() * 50) + 10,
      hours: Math.floor(Math.random() * 200) + 50,
      occupancy: Math.floor(Math.random() * 40) + 50,
      faultCount: Math.floor(Math.random() * 3),
      status: m.status,
    }
  })
})

// 按区域表格数据
const areaTableData = computed(() => {
  return machineStore.areas.map(area => {
    const areaMachines = machineStore.machines.filter(m => m.areaId === area.id)
    return {
      areaId: area.id,
      areaName: area.name,
      machineCount: areaMachines.length,
      revenue: Math.floor(Math.random() * 20000) + 5000,
      sessions: Math.floor(Math.random() * 500) + 100,
      hours: Math.floor(Math.random() * 1000) + 200,
      occupancy: Math.floor(Math.random() * 30) + 60,
      avgPrice: area.pricePerHour,
      faultCount: Math.floor(Math.random() * 8),
    }
  })
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
            { offset: 0, color: 'rgba(64, 158, 255, 0.3)' },
            { offset: 1, color: 'rgba(64, 158, 255, 0.05)' },
          ],
        },
      },
      itemStyle: { color: '#409eff' },
    },
  ],
}))

// 收入构成饼图
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
        { value: Math.floor(currentData.value.revenue * 0.7), name: '网费', itemStyle: { color: '#409eff' } },
        { value: Math.floor(currentData.value.revenue * 0.18), name: '水吧', itemStyle: { color: '#67c23a' } },
        { value: Math.floor(currentData.value.revenue * 0.08), name: '充值赠送', itemStyle: { color: '#e6a23c' } },
        { value: Math.floor(currentData.value.revenue * 0.04), name: '其他', itemStyle: { color: '#909399' } },
      ],
    },
  ],
}))

// 时段分布图表
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
      data: [5, 3, 2, 1, 1, 2, 8, 15, 25, 35, 42, 48, 52, 50, 45, 40, 38, 42, 55, 65, 72, 68, 45, 20],
      itemStyle: {
        color: (params: any) => {
          const value = params.value
          if (value >= 60) return '#f56c6c'
          if (value >= 40) return '#e6a23c'
          return '#409eff'
        },
      },
    },
  ],
}))

// 区域上座率对比
const areaChartOption = computed(() => ({
  tooltip: {
    trigger: 'axis',
    formatter: '{b}<br />上座率: {c}%',
  },
  xAxis: {
    type: 'category',
    data: machineStore.areas.map(a => a.name),
  },
  yAxis: {
    type: 'value',
    name: '上座率(%)',
    max: 100,
  },
  series: [
    {
      type: 'bar',
      data: machineStore.areas.map(() => Math.floor(Math.random() * 30) + 60),
      barWidth: '50%',
      itemStyle: {
        color: (params: any) => {
          const colors = ['#f56c6c', '#409eff', '#e6a23c', '#67c23a']
          return colors[params.dataIndex % colors.length]
        },
      },
    },
  ],
}))

// 故障类型分布
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
      data: [
        { value: 12, name: '鼠标故障' },
        { value: 8, name: '键盘故障' },
        { value: 6, name: '网络异常' },
        { value: 4, name: '显示器故障' },
        { value: 3, name: '耳机故障' },
        { value: 2, name: '蓝屏' },
      ],
    },
  ],
}))

// 故障趋势
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
      data: currentData.value.labels.map(() => Math.floor(Math.random() * 5)),
      itemStyle: { color: '#f56c6c' },
    },
  ],
}))

// 获取状态类型
const getStatusType = (status: string) => {
  const map: Record<string, string> = {
    online: 'success',
    offline: 'info',
    fault: 'danger',
    dirty: 'warning',
    cleaning: '',
  }
  return map[status] || ''
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
  const types = ['', 'danger', 'primary', 'warning']
  return types[areaId] || ''
}

// 更新图表数据
const updateChartData = (period: string) => {
  chartPeriod.value = period
}

// 更新表格数据
const updateTableData = (type: string) => {
  tableType.value = type
  currentPage.value = 1
}

// 日期变化
const handleDateChange = () => {
  ElMessage.success('数据已刷新')
}

// 区域变化
const handleAreaChange = () => {
  ElMessage.success('数据已刷新')
}

// 导出报表
const handleExport = () => {
  ElMessage.success('报表导出成功')
}

onMounted(() => {
  machineStore.fetchMachines()
  machineStore.fetchAreas()
})
</script>

<style scoped lang="scss">
.reports-container {
  .filter-bar {
    background: #fff;
    padding: 16px 20px;
    border-radius: 8px;
    margin-bottom: 20px;
  }
  
  .metric-cards {
    margin-bottom: 20px;
    
    .metric-card {
      background: #fff;
      padding: 20px;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 16px;
      
      .metric-icon {
        width: 60px;
        height: 60px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #fff;
      }
      
      &.revenue .metric-icon { background: linear-gradient(135deg, #409eff, #66b1ff); }
      &.visitors .metric-icon { background: linear-gradient(135deg, #67c23a, #85ce61); }
      &.occupancy .metric-icon { background: linear-gradient(135deg, #e6a23c, #ebb563); }
      &.avg-time .metric-icon { background: linear-gradient(135deg, #909399, #a8abb2); }
      
      .metric-content {
        flex: 1;
        
        .metric-value {
          font-size: 28px;
          font-weight: bold;
          color: #303133;
        }
        
        .metric-label {
          font-size: 14px;
          color: #909399;
          margin-top: 4px;
        }
        
        .metric-trend {
          font-size: 14px;
          margin-top: 8px;
          display: flex;
          align-items: center;
          gap: 4px;
          
          &.up { color: #67c23a; }
          &.down { color: #f56c6c; }
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
    border-radius: 8px;
    
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
  
  .table-card {
    background: #fff;
    padding: 20px;
    border-radius: 8px;
    margin-bottom: 20px;
    
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
    
    .revenue-value {
      color: #409eff;
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
