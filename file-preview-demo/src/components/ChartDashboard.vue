<template>
  <div class="chart-dashboard">
    <section class="chart-dashboard__hero">
      <div>
        <p class="chart-dashboard__eyebrow">REALTIME ANALYTICS</p>
        <h2 class="chart-dashboard__title">数据大屏</h2>
        <p class="chart-dashboard__desc">统一查看用户、订单、收入、转化率和热门商品变化趋势。</p>
      </div>
      <div class="chart-dashboard__actions">
        <el-select v-model="timeRange" class="time-select" placeholder="选择时间范围">
          <el-option label="最近7天" value="7d" />
          <el-option label="最近30天" value="30d" />
          <el-option label="最近90天" value="90d" />
        </el-select>
        <el-button class="chart-dashboard__button" @click="refreshData()">
          <el-icon><Refresh /></el-icon>刷新数据
        </el-button>
      </div>
    </section>

    <!-- 上方统计卡片 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon stat-icon--user">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.totalUsers }}</div>
              <div class="stat-title">用户总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon stat-icon--order">
              <el-icon><Document /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.todayOrders }}</div>
              <div class="stat-title">今日订单</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon stat-icon--revenue">
              <el-icon><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number stat-number--revenue">¥{{ formatNumber(stats.totalRevenue) }}</div>
              <div class="stat-title">总收入</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon stat-icon--rate">
              <el-icon><TrendCharts /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.conversionRate }}%</div>
              <div class="stat-title">转化率</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 主图表区域 -->
    <el-row :gutter="20" style="margin-top: 30px;">
      <el-col :span="16">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>月度销售额趋势（柱状图）</span>
              <el-radio-group v-model="chartType" size="small">
                <el-radio-button label="bar">柱状图</el-radio-button>
                <el-radio-button label="line">折线图</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          
          <div ref="mainChart" style="width: 100%; height: 400px;"></div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>用户地域分布</span>
            </div>
          </template>
          
          <div ref="pieChart" style="width: 100%; height: 400px;"></div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 下方小图表区域 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="8">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>周订单量</span>
            </div>
          </template>
          
          <div ref="weekChart" style="width: 100%; height: 300px;"></div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>用户活跃趋势</span>
            </div>
          </template>
          
          <div ref="lineChart" style="width: 100%; height: 300px;"></div>
        </el-card>
      </el-col>
      
      <el-col :span="8">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span>热门商品排行</span>
            </div>
          </template>
          
          <el-table :data="hotProducts" height="260" style="width: 100%;">
            <el-table-column prop="name" label="商品名称" />
            <el-table-column prop="sales" label="销量" width="80">
              <template #default="{ row }">
                {{ formatNumber(row.sales) }}
              </template>
            </el-table-column>
            <el-table-column prop="growth" label="增长率" width="80">
              <template #default="{ row }">
                <span :class="row.growth >= 0 ? 'trend-up' : 'trend-down'">
                  {{ row.growth >= 0 ? '+' : '' }}{{ row.growth }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column label="趋势" width="80">
              <template #default="{ row }">
                <el-icon v-if="row.growth >= 0" class="trend-up"><Top /></el-icon>
                <el-icon v-else class="trend-down"><Bottom /></el-icon>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import * as echarts from 'echarts'
import {
  UserFilled,
  Document,
  Money,
  TrendCharts,
  Refresh,
  Top,
  Bottom
} from '@element-plus/icons-vue'

// 数据状态
const timeRange = ref('7d')
const chartType = ref('bar')
const stats = ref({
  totalUsers: 12890,
  todayOrders: 345,
  totalRevenue: 1284567,
  conversionRate: 3.8
})

// 热门商品数据
const hotProducts = ref([
  { name: '华为Mate 60 Pro', sales: 12890, growth: 12.5 },
  { name: 'iPhone 16 Pro Max', sales: 11023, growth: 8.2 },
  { name: '小米14 Ultra', sales: 8920, growth: 15.7 },
  { name: 'MacBook Air M4', sales: 5678, growth: -2.3 },
  { name: 'iPad Pro M3', sales: 4321, growth: 5.8 },
  { name: 'Galaxy S24 Ultra', sales: 3890, growth: 18.4 }
])

// ECharts实例
const mainChart = ref(null)
const pieChart = ref(null)
const weekChart = ref(null)
const lineChart = ref(null)
let mainChartInstance = null
let pieChartInstance = null
let weekChartInstance = null
let lineChartInstance = null

const chartPalette = {
  bg: '#0d1c13',
  panel: '#07120c',
  line: '#173f2a',
  text: '#d7ffe7',
  muted: '#93b89f',
  green: '#2ee68a',
  greenDark: '#1f8f58',
  orange: '#f1b44c',
  red: '#ff6b6b',
  cyan: '#55d6be'
}

const tooltipStyle = {
  backgroundColor: 'rgba(7, 18, 12, 0.94)',
  borderColor: chartPalette.line,
  textStyle: { color: chartPalette.text }
}

const axisStyle = {
  axisLine: { lineStyle: { color: chartPalette.line } },
  axisTick: { lineStyle: { color: chartPalette.line } },
  axisLabel: { color: chartPalette.muted },
  splitLine: { lineStyle: { color: 'rgba(23, 63, 42, 0.72)' } },
  nameTextStyle: { color: chartPalette.muted }
}

// 模拟的月度数据
const monthData = ref([
  { month: '1月', sales: 42000, users: 3200 },
  { month: '2月', sales: 38000, users: 2800 },
  { month: '3月', sales: 52000, users: 4200 },
  { month: '4月', sales: 48000, users: 3800 },
  { month: '5月', sales: 62000, users: 5200 },
  { month: '6月', sales: 58000, users: 4800 },
  { month: '7月', sales: 72000, users: 6200 },
  { month: '8月', sales: 68000, users: 5800 },
  { month: '9月', sales: 82000, users: 7200 },
  { month: '10月', sales: 78000, users: 6800 },
  { month: '11月', sales: 92000, users: 8200 },
  { month: '12月', sales: 88000, users: 7800 }
])

// 初始化图表
const initCharts = () => {
  // 主柱状图
  if (!mainChartInstance && mainChart.value) {
    mainChartInstance = echarts.init(mainChart.value)
  }
  const mainOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      ...tooltipStyle
    },
    legend: {
      data: ['销售额', '用户数'],
      textStyle: { color: chartPalette.muted }
    },
    xAxis: {
      type: 'category',
      data: monthData.value.map(item => item.month),
      ...axisStyle
    },
    yAxis: [
      {
        type: 'value',
        name: '销售额(元)',
        position: 'left',
        ...axisStyle
      },
      {
        type: 'value',
        name: '用户数',
        position: 'right',
        ...axisStyle
      }
    ],
    series: [
      {
        name: '销售额',
        type: chartType.value,
        data: monthData.value.map(item => item.sales),
        itemStyle: {
          color: chartPalette.green
        }
      },
      {
        name: '用户数',
        type: 'line',
        yAxisIndex: 1,
        data: monthData.value.map(item => item.users),
        itemStyle: {
          color: chartPalette.cyan
        },
        lineStyle: { color: chartPalette.cyan }
      }
    ],
    grid: { top: 52, bottom: 40, left: 64, right: 64 }
  }
  mainChartInstance.setOption(mainOption)

  // 饼图
  if (!pieChartInstance && pieChart.value) {
    pieChartInstance = echarts.init(pieChart.value)
  }
  const pieOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'item', ...tooltipStyle },
    color: [chartPalette.green, chartPalette.greenDark, chartPalette.cyan, chartPalette.orange, '#7aa58b'],
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'center',
      textStyle: { color: chartPalette.muted }
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        data: [
          { value: 35, name: '华东地区' },
          { value: 25, name: '华南地区' },
          { value: 18, name: '华北地区' },
          { value: 12, name: '华中地区' },
          { value: 10, name: '其他地区' }
        ],
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(46, 230, 138, 0.28)'
          }
        }
      }
    ]
  }
  pieChartInstance.setOption(pieOption)

  // 周订单柱状图
  if (!weekChartInstance && weekChart.value) {
    weekChartInstance = echarts.init(weekChart.value)
  }
  const weekOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', ...tooltipStyle },
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
      ...axisStyle
    },
    yAxis: { type: 'value', ...axisStyle },
    series: [
      {
        data: [120, 200, 150, 80, 70, 110, 130],
        type: 'bar',
        itemStyle: { color: chartPalette.green }
      }
    ],
    grid: { top: 20, bottom: 20, left: 40, right: 20 }
  }
  weekChartInstance.setOption(weekOption)

  // 折线图
  if (!lineChartInstance && lineChart.value) {
    lineChartInstance = echarts.init(lineChart.value)
  }
  const lineOption = {
    backgroundColor: 'transparent',
    tooltip: { trigger: 'axis', ...tooltipStyle },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00'],
      ...axisStyle
    },
    yAxis: { type: 'value', ...axisStyle },
    series: [
      {
        data: [820, 932, 901, 934, 1290, 1330, 1320, 1100, 920],
        type: 'line',
        smooth: true,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(46, 230, 138, 0.28)' },
            { offset: 1, color: 'rgba(46, 230, 138, 0.04)' }
          ])
        },
        lineStyle: { color: chartPalette.green }
      }
    ],
    grid: { top: 20, bottom: 20, left: 40, right: 20 }
  }
  lineChartInstance.setOption(lineOption)
}

// 刷新数据
const refreshData = () => {
  // 模拟数据更新
  stats.value = {
    totalUsers: Math.floor(Math.random() * 5000) + 10000,
    todayOrders: Math.floor(Math.random() * 200) + 300,
    totalRevenue: Math.floor(Math.random() * 500000) + 1000000,
    conversionRate: (Math.random() * 2 + 2.5).toFixed(1)
  }
  
  // 更新图表
  initCharts()
}

// 格式化数字
const formatNumber = (num) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 监听图表类型变化
watch(chartType, () => {
  initCharts()
})

// 监听窗口大小变化
window.addEventListener('resize', () => {
  if (mainChartInstance) mainChartInstance.resize()
  if (pieChartInstance) pieChartInstance.resize()
  if (weekChartInstance) weekChartInstance.resize()
  if (lineChartInstance) lineChartInstance.resize()
})

// 生命周期
onMounted(() => {
  nextTick(() => {
    initCharts()
  })
})
</script>

<style scoped>
.chart-dashboard {
  min-height: calc(100vh - 120px);
  padding: 22px;
  color: #d7ffe7;
  background: #07120c;
}

.chart-dashboard__hero,
.stat-card,
.chart-card {
  border: 1px solid #173f2a;
  background: #0d1c13;
}

.chart-dashboard__hero {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 24px;
  margin-bottom: 20px;
}

.chart-dashboard__eyebrow {
  margin: 0 0 8px;
  color: #2ee68a;
  font-size: 12px;
  letter-spacing: 2px;
}

.chart-dashboard__title {
  margin: 0;
  color: #f1fff6;
  font-size: 30px;
  font-weight: 700;
}

.chart-dashboard__desc {
  margin: 10px 0 0;
  color: #93b89f;
}

.chart-dashboard__actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-select {
  width: 200px;
}

.chart-dashboard__button {
  border-color: #2ee68a;
  color: #07120c;
  background: #2ee68a;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  color: #07120c;
  font-size: 24px;
}

.stat-icon--user {
  background: #2ee68a;
}

.stat-icon--order {
  background: #55d6be;
}

.stat-icon--revenue {
  background: #f1b44c;
}

.stat-icon--rate {
  background: #ff6b6b;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #f1fff6;
  line-height: 1.2;
}

.stat-number--revenue {
  color: #f1b44c;
}

.stat-title {
  font-size: 14px;
  color: #93b89f;
  margin-top: 4px;
}

.chart-card {
  height: 100%;
}

.chart-card :deep(.el-card__header),
.stat-card :deep(.el-card__header) {
  border-bottom-color: #173f2a;
}

.chart-card :deep(.el-card__body),
.stat-card :deep(.el-card__body) {
  background: #0d1c13;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #f1fff6;
  font-weight: 700;
}

.el-table {
  font-size: 14px;
}

.chart-dashboard :deep(.el-input__wrapper),
.chart-dashboard :deep(.el-select__wrapper) {
  background: #07120c;
  box-shadow: 0 0 0 1px #173f2a inset;
}

.chart-dashboard :deep(.el-input__wrapper:hover),
.chart-dashboard :deep(.el-select__wrapper:hover) {
  box-shadow: 0 0 0 1px #2ee68a inset;
}

.chart-dashboard :deep(.el-input__inner),
.chart-dashboard :deep(.el-select__placeholder),
.chart-dashboard :deep(.el-select__selected-item) {
  color: #d7ffe7;
}

.chart-dashboard :deep(.el-radio-button__inner) {
  border-color: #173f2a;
  color: #93b89f;
  background: #07120c;
}

.chart-dashboard :deep(.el-radio-button__original-radio:checked + .el-radio-button__inner) {
  border-color: #2ee68a;
  color: #07120c;
  background: #2ee68a;
  box-shadow: -1px 0 0 0 #2ee68a;
}

.chart-dashboard :deep(.el-table__inner-wrapper),
.chart-dashboard :deep(.el-table__body),
.chart-dashboard :deep(.el-table__header),
.chart-dashboard :deep(.el-table__body-wrapper),
.chart-dashboard :deep(.el-scrollbar__view),
.chart-dashboard :deep(th.el-table__cell),
.chart-dashboard :deep(td.el-table__cell) {
  background: #0d1c13;
}

.chart-dashboard :deep(.el-table__inner-wrapper::before),
.chart-dashboard :deep(.el-table__border-left-patch) {
  background-color: #173f2a;
}

.chart-dashboard :deep(th.el-table__cell),
.chart-dashboard :deep(td.el-table__cell) {
  border-bottom-color: #173f2a;
  color: #d7ffe7;
}

.chart-dashboard :deep(.el-table__row:hover > td.el-table__cell) {
  background: #102817;
}

.el-table :deep(.cell) {
  padding: 8px 12px;
}

.trend-up {
  color: #2ee68a;
}

.trend-down {
  color: #ff6b6b;
}

@media (max-width: 1200px) {
  .chart-dashboard__hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .chart-dashboard__actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>
