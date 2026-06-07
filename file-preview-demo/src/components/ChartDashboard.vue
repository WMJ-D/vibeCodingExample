<template>
  <div class="chart-dashboard">
    <div class="dashboard-header">
      <h2>数据大屏 - 图表展示</h2>
      <el-select v-model="timeRange" style="width: 200px; margin-left: 20px;" placeholder="选择时间范围">
        <el-option label="最近7天" value="7d" />
        <el-option label="最近30天" value="30d" />
        <el-option label="最近90天" value="90d" />
      </el-select>
      <el-button type="primary" style="margin-left: 20px;" @click="refreshData()">
        <el-icon><Refresh /></el-icon>刷新数据
      </el-button>
    </div>

    <!-- 上方统计卡片 -->
    <el-row :gutter="20" style="margin-top: 20px;">
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #36a3f7;">
              <el-icon style="color: white;"><UserFilled /></el-icon>
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
            <div class="stat-icon" style="background-color: #34c38f;">
              <el-icon style="color: white;"><Document /></el-icon>
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
            <div class="stat-icon" style="background-color: #f1b44c;">
              <el-icon style="color: white;"><Money /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number" style="color: #f1b44c;">¥{{ formatNumber(stats.totalRevenue) }}</div>
              <div class="stat-title">总收入</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon" style="background-color: #f46a6a;">
              <el-icon style="color: white;"><TrendCharts /></el-icon>
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
                <span :style="{ color: row.growth >= 0 ? '#34c38f' : '#f46a6a' }">
                  {{ row.growth >= 0 ? '+' : '' }}{{ row.growth }}%
                </span>
              </template>
            </el-table-column>
            <el-table-column label="趋势" width="80">
              <template #default="{ row }">
                <el-icon v-if="row.growth >= 0" color="#34c38f"><Top /></el-icon>
                <el-icon v-else color="#f46a6a"><Bottom /></el-icon>
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
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' }
    },
    legend: {
      data: ['销售额', '用户数']
    },
    xAxis: {
      type: 'category',
      data: monthData.value.map(item => item.month)
    },
    yAxis: [
      {
        type: 'value',
        name: '销售额(元)',
        position: 'left'
      },
      {
        type: 'value',
        name: '用户数',
        position: 'right'
      }
    ],
    series: [
      {
        name: '销售额',
        type: chartType.value,
        data: monthData.value.map(item => item.sales),
        itemStyle: {
          color: '#36a3f7'
        }
      },
      {
        name: '用户数',
        type: 'line',
        yAxisIndex: 1,
        data: monthData.value.map(item => item.users),
        itemStyle: {
          color: '#34c38f'
        }
      }
    ]
  }
  mainChartInstance.setOption(mainOption)

  // 饼图
  if (!pieChartInstance && pieChart.value) {
    pieChartInstance = echarts.init(pieChart.value)
  }
  const pieOption = {
    tooltip: { trigger: 'item' },
    legend: {
      orient: 'vertical',
      left: 'left',
      top: 'center'
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
            shadowColor: 'rgba(0, 0, 0, 0.5)'
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
    xAxis: {
      type: 'category',
      data: ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
    },
    yAxis: { type: 'value' },
    series: [
      {
        data: [120, 200, 150, 80, 70, 110, 130],
        type: 'bar',
        itemStyle: { color: '#f1b44c' }
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
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: ['9:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
    },
    yAxis: { type: 'value' },
    series: [
      {
        data: [820, 932, 901, 934, 1290, 1330, 1320, 1100, 920],
        type: 'line',
        smooth: true,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(54, 163, 247, 0.3)' },
            { offset: 1, color: 'rgba(54, 163, 247, 0.1)' }
          ])
        },
        lineStyle: { color: '#36a3f7' }
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
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100%;
}

.dashboard-header {
  display: flex;
  align-items: center;
  margin-bottom: 20px;
}

.dashboard-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #333;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #333;
  line-height: 1.2;
}

.stat-title {
  font-size: 14px;
  color: #666;
  margin-top: 4px;
}

.chart-card {
  height: 100%;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.el-table {
  font-size: 14px;
}

.el-table :deep(.cell) {
  padding: 8px 12px;
}
</style>