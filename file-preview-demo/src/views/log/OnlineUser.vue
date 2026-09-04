<template>
  <div class="page-container">
    <el-form :model="query" inline>
      <el-form-item label="所属系统">
        <el-select v-model="query.appId" placeholder="请选择" clearable filterable style="width: 150px">
          <el-option v-for="app in appOptions" :key="app.appId" :label="app.appName" :value="app.appId" />
        </el-select>
      </el-form-item>
      <el-form-item label="用户名">
        <el-input v-model="query.username" placeholder="请输入用户名" clearable @keyup.enter="search" />
      </el-form-item>
      <el-form-item label="登录 IP">
        <el-input v-model="query.ip" placeholder="请输入登录 IP" clearable @keyup.enter="search" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="search">搜索</el-button>
        <el-button icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="action-bar">
      <el-button
        v-permission="'log:online:kick'"
        type="danger"
        icon="SwitchButton"
        :disabled="!selectedSessionIds.length"
        @click="handleBatchKick"
      >批量强退</el-button>
      <el-button v-permission="'log:online:clean'" type="warning" icon="Delete" @click="handleClean">清理过期会话</el-button>
      <el-button icon="RefreshRight" @click="getList">刷新</el-button>
    </div>

    <el-table v-loading="loading" :data="tableData" border stripe @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" :selectable="row => !row.isCurrent" />
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="appName" label="所属系统" width="110" align="center">
        <template #default="{ row }">{{ row.appName || row.appId || '—' }}</template>
      </el-table-column>
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="nickname" label="用户昵称" width="120" />
      <el-table-column prop="orgName" label="所属组织" width="140" show-overflow-tooltip />
      <el-table-column prop="ip" label="登录 IP" width="140" />
      <el-table-column prop="location" label="登录地点" min-width="130">
        <template #default="{ row }">{{ row.location || '—' }}</template>
      </el-table-column>
      <el-table-column prop="browser" label="浏览器" width="120" />
      <el-table-column prop="os" label="操作系统" width="130" />
      <el-table-column prop="loginAt" label="登录时间" width="170" />
      <el-table-column prop="lastActiveAt" label="最后活跃" width="170" />
      <el-table-column label="在线时长" width="120" align="center">
        <template #default="{ row }">{{ formatDuration(row.onlineDurationSeconds) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.isCurrent ? 'warning' : 'success'" size="small">{{ row.isCurrent ? '当前会话' : '在线' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="110" align="center" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="!row.isCurrent"
            v-permission="'log:online:kick'"
            type="danger"
            link
            icon="SwitchButton"
            @click="handleKick(row)"
          >强制下线</el-button>
          <span v-else>—</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50]"
        background
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="getList"
        @current-change="getList"
      />
    </div>
  </div>
</template>

<script setup>
import { onActivated, onDeactivated, onMounted, onUnmounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  batchKickOnlineSessions,
  cleanExpiredSessions,
  getOnlineUserList,
  kickOnlineSession,
} from '@/api/log'
import { getAppList } from '@/api/app'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const selectedSessionIds = ref([])
const appOptions = ref([])
const query = reactive({ appId: '', username: '', ip: '', pageNum: 1, pageSize: 10 })
let refreshTimer = null

async function loadApps() {
  try {
    const result = await getAppList({ pageNum: 1, pageSize: 100 })
    appOptions.value = (result?.list || []).filter(item => item.status === '1' || item.status === 1)
  } catch {
    appOptions.value = []
  }
}

async function getList(silent = false) {
  if (!silent) loading.value = true
  try {
    const result = await getOnlineUserList(query)
    tableData.value = result?.list || []
    total.value = Number(result?.total) || 0
    selectedSessionIds.value = []
  } catch (error) {
    if (!silent) {
      tableData.value = []
      total.value = 0
      ElMessage.error(error?.message || '在线用户查询失败')
    }
  } finally {
    if (!silent) loading.value = false
  }
}

function search() {
  query.pageNum = 1
  getList()
}

function reset() {
  Object.assign(query, { username: '', ip: '', pageNum: 1 })
  getList()
}

function handleSelectionChange(rows) {
  selectedSessionIds.value = rows.filter(row => !row.isCurrent).map(row => row.sessionId)
}

function formatDuration(seconds) {
  const value = Math.max(0, Number(seconds) || 0)
  const hours = Math.floor(value / 3600)
  const minutes = Math.floor((value % 3600) / 60)
  if (hours) return `${hours}小时${minutes}分钟`
  return `${minutes}分钟`
}

async function handleKick(row) {
  try {
    await ElMessageBox.confirm(`确认强制用户「${row.username}」的该会话下线？`, '提示', { type: 'warning' })
    await kickOnlineSession(row.sessionId, '管理员强制下线')
    ElMessage.success('强制下线成功')
    await getList()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '强制下线失败')
  }
}

async function handleBatchKick() {
  try {
    await ElMessageBox.confirm(`确认强制选中的 ${selectedSessionIds.value.length} 个会话下线？`, '提示', { type: 'warning' })
    await batchKickOnlineSessions(selectedSessionIds.value, '管理员批量强制下线')
    ElMessage.success('批量强制下线成功')
    await getList()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '批量强制下线失败')
  }
}

async function handleClean() {
  try {
    await ElMessageBox.confirm('确认标记超时会话并清理 30 天前的离线会话？', '提示', { type: 'warning' })
    const result = await cleanExpiredSessions()
    ElMessage.success(`清理完成：标记过期 ${result?.expiredCount || 0} 条，删除历史 ${result?.removedCount || 0} 条`)
    await getList()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '清理会话失败')
  }
}

function startRefresh() {
  if (refreshTimer) return
  refreshTimer = window.setInterval(() => getList(true), 30 * 1000)
}

function stopRefresh() {
  if (!refreshTimer) return
  window.clearInterval(refreshTimer)
  refreshTimer = null
}

onMounted(() => {
  getList()
  loadApps()
  startRefresh()
})
onUnmounted(stopRefresh)
onActivated(startRefresh)
onDeactivated(stopRefresh)
</script>

<style scoped>
.page-container { padding: 20px; background: #fff; border-radius: 4px; }
.action-bar { margin-bottom: 12px; }
.pagination-wrap { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
