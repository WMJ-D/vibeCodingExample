<template>
  <div class="page-container">
    <el-form :model="query" inline>
      <el-form-item label="用户名">
        <el-input v-model="query.username" placeholder="请输入" clearable />
      </el-form-item>
      <el-form-item label="登录IP">
        <el-input v-model="query.ip" placeholder="请输入" clearable />
      </el-form-item>
      <el-form-item label="登录状态">
        <el-select v-model="query.status" placeholder="请选择" clearable style="width: 120px">
          <el-option label="成功" value="成功" />
          <el-option label="失败" value="失败" />
        </el-select>
      </el-form-item>
      <el-form-item label="登录时间">
        <el-date-picker v-model="query.dateRange" type="daterange" range-separator="至"
          start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 260px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="search">搜索</el-button>
        <el-button icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <div style="margin-bottom: 12px">
      <el-button type="danger" icon="Delete" :disabled="!selectedIds.length" @click="handleBatchDelete">批量删除</el-button>
      <el-button type="warning" icon="Download" @click="handleExport">导出</el-button>
    </div>

    <el-table v-loading="loading" :data="tableData" border stripe @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="ip" label="登录IP" width="140" align="center" />
      <el-table-column prop="location" label="登录地点" width="140" />
      <el-table-column prop="browser" label="浏览器" width="140" />
      <el-table-column prop="os" label="操作系统" width="140" />
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === '成功' ? 'success' : 'danger'" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="message" label="提示信息" min-width="160" show-overflow-tooltip />
      <el-table-column prop="loginTime" label="登录时间" width="170" align="center" />
    </el-table>

    <div style="margin-top: 16px; display: flex; justify-content: flex-end">
      <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
        :total="total" :page-sizes="[10, 20, 50]" background layout="total, sizes, prev, pager, next, jumper"
        @size-change="getList" @current-change="getList" />
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const selectedIds = ref([])
const query = reactive({ username: '', ip: '', status: '', dateRange: null, pageNum: 1, pageSize: 10 })

const usernames = ['admin', '张三', '李四', '王五', '赵六']
const browsers = ['Chrome 120', 'Firefox 121', 'Edge 120', 'Safari 17']
const osList = ['Windows 10', 'Windows 11', 'macOS 14', 'Linux']
const locations = ['武汉', '北京', '上海', '深圳', '广州', '成都']

const mockData = Array.from({ length: 85 }, (_, i) => ({
  id: i + 1,
  username: usernames[i % usernames.length],
  ip: `192.168.${1 + (i % 5)}.${100 + (i % 155)}`,
  location: locations[i % locations.length],
  browser: browsers[i % browsers.length],
  os: osList[i % osList.length],
  status: i % 8 === 0 ? '失败' : '成功',
  message: i % 8 === 0 ? '密码错误' : '登录成功',
  loginTime: `2026-03-${String(23 - (i % 23)).padStart(2, '0')} ${String(7 + (i % 16)).padStart(2, '0')}:${String(i % 60).padStart(2, '0')}:${String((i * 7) % 60).padStart(2, '0')}`,
}))

async function getList() {
  loading.value = true
  await new Promise(r => setTimeout(r, 300))
  let filtered = mockData.filter(item => {
    if (query.username && !item.username.includes(query.username)) return false
    if (query.ip && !item.ip.includes(query.ip)) return false
    if (query.status && item.status !== query.status) return false
    return true
  })
  total.value = filtered.length
  const start = (query.pageNum - 1) * query.pageSize
  tableData.value = filtered.slice(start, start + query.pageSize)
  loading.value = false
}
function search() { query.pageNum = 1; getList() }
function reset() { Object.assign(query, { username: '', ip: '', status: '', dateRange: null, pageNum: 1 }); getList() }
function handleSelectionChange(rows) { selectedIds.value = rows.map(r => r.id) }

async function handleBatchDelete() {
  await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 条记录？`, '提示', { type: 'warning' })
  ElMessage.success('删除成功'); getList()
}
function handleExport() { ElMessage.success('导出成功（演示）') }

onMounted(() => getList())
</script>

<style scoped>
.page-container { padding: 20px; background: #fff; border-radius: 4px; }
</style>
