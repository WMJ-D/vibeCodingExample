<template>
  <div class="page-container">
    <el-form :model="query" inline>
      <el-form-item label="操作模块">
        <el-input v-model="query.module" placeholder="请输入" clearable />
      </el-form-item>
      <el-form-item label="操作人">
        <el-input v-model="query.operator" placeholder="请输入" clearable />
      </el-form-item>
      <el-form-item label="操作类型">
        <el-select v-model="query.type" placeholder="请选择" clearable style="width: 130px">
          <el-option label="新增" value="新增" />
          <el-option label="修改" value="修改" />
          <el-option label="删除" value="删除" />
          <el-option label="查询" value="查询" />
          <el-option label="导出" value="导出" />
        </el-select>
      </el-form-item>
      <el-form-item label="操作时间">
        <el-date-picker v-model="query.dateRange" type="daterange" range-separator="至"
          start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 260px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="search">搜索</el-button>
        <el-button icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <div style="margin-bottom: 12px">
      <el-button v-permission="'log:operation:delete'" type="danger" icon="Delete" :disabled="!selectedIds.length" @click="handleBatchDelete">批量删除</el-button>
      <el-button v-permission="'log:operation:export'" type="warning" icon="Download" @click="handleExport">导出</el-button>
    </div>

    <el-table v-loading="loading" :data="tableData" border stripe @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="module" label="操作模块" width="120" />
      <el-table-column prop="type" label="操作类型" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="{ '新增': 'success', '修改': '', '删除': 'danger', '查询': 'info', '导出': 'warning' }[row.type]" size="small">
            {{ row.type }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="description" label="操作描述" min-width="200" show-overflow-tooltip />
      <el-table-column prop="operator" label="操作人" width="100" align="center" />
      <el-table-column prop="ip" label="操作IP" width="140" align="center" />
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === '成功' ? 'success' : 'danger'" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="operTime" label="操作时间" width="170" align="center" />
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
import { batchDeleteOperationLogs, exportOperationLogs, getOperationLogList } from '@/api/log'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const selectedIds = ref([])
const query = reactive({ module: '', operator: '', type: '', dateRange: null, pageNum: 1, pageSize: 10 })

function getQueryParams(includePagination = true) {
  const params = {
    module: query.module,
    operator: query.operator,
    type: query.type,
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
    const result = await getOperationLogList(getQueryParams())
    tableData.value = result?.list || []
    total.value = Number(result?.total) || 0
    selectedIds.value = []
  } catch (error) {
    tableData.value = []
    total.value = 0
    ElMessage.error(error?.message || '操作日志查询失败')
  } finally {
    loading.value = false
  }
}
function search() { query.pageNum = 1; getList() }
function reset() { Object.assign(query, { module: '', operator: '', type: '', dateRange: null, pageNum: 1 }); getList() }
function handleSelectionChange(rows) { selectedIds.value = rows.map(r => r.id) }

async function handleBatchDelete() {
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 条记录？`, '提示', { type: 'warning' })
    await batchDeleteOperationLogs(selectedIds.value)
    ElMessage.success('删除成功')
    if (tableData.value.length === selectedIds.value.length && query.pageNum > 1) query.pageNum -= 1
    await getList()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '删除失败')
  }
}
async function handleExport() {
  try {
    const blob = await exportOperationLogs(getQueryParams(false))
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'operation-logs.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (error) {
    ElMessage.error(error?.message || '导出失败')
  }
}

onMounted(() => getList())
</script>

<style scoped>
.page-container { padding: 20px; background: #fff; border-radius: 4px; }
</style>
