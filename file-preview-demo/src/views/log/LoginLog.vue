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
      <el-button v-permission="'log:login:delete'" type="danger" icon="Delete" :disabled="!selectedIds.length" @click="handleBatchDelete">批量删除</el-button>
      <el-button v-permission="'log:login:export'" type="warning" icon="Download" @click="handleExport">导出</el-button>
    </div>

    <el-table v-loading="loading" :data="tableData" border stripe @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="appName" label="所属系统" width="110" align="center">
        <template #default="{ row }">{{ row.appName || row.appId || '—' }}</template>
      </el-table-column>
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
import { batchDeleteLoginLogs, exportLoginLogs, getLoginLogList } from '@/api/log'
import { getAppList } from '@/api/app'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const selectedIds = ref([])
const appOptions = ref([])
const query = reactive({ appId: '', username: '', ip: '', status: '', dateRange: null, pageNum: 1, pageSize: 10 })

async function loadApps() {
  try {
    const result = await getAppList({ pageNum: 1, pageSize: 100 })
    appOptions.value = (result?.list || []).filter(item => item.status === '1' || item.status === 1)
  } catch {
    appOptions.value = []
  }
}

function getQueryParams(includePagination = true) {
  const params = {
    appId: query.appId || undefined,
    username: query.username,
    ip: query.ip,
    status: query.status,
    dateRange: query.dateRange || undefined,
  }
  if (includePagination) {
    params.pageNum = query.pageNum
    params.pageSize = query.pageSize
  }
  return params
}

async function getList() {
  loading.value = true
  try {
    const result = await getLoginLogList(getQueryParams())
    tableData.value = result?.list || []
    total.value = Number(result?.total) || 0
    selectedIds.value = []
  } catch (error) {
    tableData.value = []
    total.value = 0
    ElMessage.error(error?.message || '登录日志查询失败')
  } finally {
    loading.value = false
  }
}
function search() { query.pageNum = 1; getList() }
function reset() { Object.assign(query, { appId: '', username: '', ip: '', status: '', dateRange: null, pageNum: 1 }); getList() }
function handleSelectionChange(rows) { selectedIds.value = rows.map(r => r.id) }

async function handleBatchDelete() {
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 条记录？`, '提示', { type: 'warning' })
    await batchDeleteLoginLogs(selectedIds.value)
    ElMessage.success('删除成功')
    if (tableData.value.length === selectedIds.value.length && query.pageNum > 1) query.pageNum -= 1
    await getList()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '删除失败')
  }
}
async function handleExport() {
  try {
    const blob = await exportLoginLogs(getQueryParams(false))
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'login-logs.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error(error?.message || '导出失败')
  }
}

onMounted(() => { getList(); loadApps() })
</script>

<style scoped>
.page-container { padding: 20px; background: #fff; border-radius: 4px; }
</style>
