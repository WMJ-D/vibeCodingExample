<template>
  <div class="page-container">
    <el-form :model="query" inline>
      <el-form-item label="文件名称">
        <el-input v-model="query.fileName" placeholder="请输入文件名称" clearable @keyup.enter="search" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="search">搜索</el-button>
        <el-button icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="action-bar">
      <div v-permission="'system:file:upload'">
        <input ref="fileInputRef" class="hidden-input" type="file" multiple @change="handleUploadChange" />
        <el-button type="primary" icon="Upload" :loading="uploadLoading" @click="fileInputRef?.click()">批量上传</el-button>
      </div>
      <el-button
        v-permission="'system:file:delete'"
        type="danger"
        icon="Delete"
        :disabled="!selectedIds.length"
        @click="handleBatchDelete"
      >批量删除</el-button>
      <span class="upload-tip">单个文件不超过 100MB</span>
    </div>

    <el-table v-loading="loading" :data="tableData" border stripe @selection-change="handleSelectionChange">
      <el-table-column type="selection" width="50" align="center" />
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="originalName" label="文件名称" min-width="260" show-overflow-tooltip>
        <template #default="{ row }">
          <div class="file-name-cell">
            <el-icon><Document /></el-icon>
            <span>{{ row.originalName }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="appName" label="所属系统" min-width="120" align="center">
        <template #default="{ row }">{{ row.appName || row.appId || '公共文件' }}</template>
      </el-table-column>
      <el-table-column prop="contentType" label="文件类型" width="180" show-overflow-tooltip>
        <template #default="{ row }">{{ row.contentType || '未知类型' }}</template>
      </el-table-column>
      <el-table-column prop="fileSizeText" label="文件大小" width="110" align="right" />
      <el-table-column prop="uploaderUsername" label="上传人" width="120" align="center" />
      <el-table-column prop="createdAt" label="上传时间" width="170" align="center" />
      <el-table-column label="操作" width="220" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" icon="View" :loading="previewLoadingId === row.id" @click="handlePreview(row)">预览</el-button>
          <el-button v-permission="'system:file:download'" link type="primary" icon="Download" @click="handleDownload(row)">下载</el-button>
          <el-button v-permission="'system:file:delete'" link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="previewVisible" :title="previewFile?.name || '文件预览'" width="min(1200px, 90vw)" destroy-on-close class="file-preview-dialog">
      <file-viewer
        v-if="previewVisible && previewFile"
        :file="previewFile"
        :options="previewOptions"
        class="file-preview-viewer"
      />
    </el-dialog>

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
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { deleteFiles, downloadFile, getFileList, uploadFiles } from '@/api/file'

const loading = ref(false)
const uploadLoading = ref(false)
const fileInputRef = ref(null)
const tableData = ref([])
const total = ref(0)
const selectedIds = ref([])
const previewVisible = ref(false)
const previewFile = ref(null)
const previewLoadingId = ref(null)
const previewOptions = {
  toolbar: {
    download: true,
    print: true,
    exportHtml: true
  },
  watermark: {
    text: '内部预览',
    opacity: 0.12
  }
}
const query = reactive({ fileName: '', pageNum: 1, pageSize: 10 })

async function getList() {
  loading.value = true
  try {
    const result = await getFileList(query)
    tableData.value = result?.list || []
    total.value = Number(result?.total) || 0
    selectedIds.value = []
  } catch (error) {
    tableData.value = []
    total.value = 0
    ElMessage.error(error?.message || '获取文件列表失败')
  } finally {
    loading.value = false
  }
}

function search() {
  query.pageNum = 1
  getList()
}

function reset() {
  Object.assign(query, { fileName: '', pageNum: 1 })
  getList()
}

function handleSelectionChange(rows) {
  selectedIds.value = rows.map(row => row.id)
}

async function handleUploadChange(event) {
  const selectedFiles = Array.from(event.target.files || [])
  event.target.value = ''
  if (!selectedFiles.length || uploadLoading.value) return
  const formData = new FormData()
  selectedFiles.forEach(file => formData.append('files', file))
  uploadLoading.value = true
  try {
    await uploadFiles(formData)
    ElMessage.success(`成功上传 ${selectedFiles.length} 个文件`)
    await getList()
  } catch (error) {
    ElMessage.error(error?.message || '文件上传失败')
  } finally {
    uploadLoading.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除文件「${row.originalName}」？`, '提示', { type: 'warning' })
    await deleteFiles([row.id])
    ElMessage.success('删除成功')
    await getList()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '删除文件失败')
  }
}

async function handleBatchDelete() {
  try {
    await ElMessageBox.confirm(`确认删除选中的 ${selectedIds.value.length} 个文件？`, '提示', { type: 'warning' })
    await deleteFiles(selectedIds.value)
    ElMessage.success('删除成功')
    if (tableData.value.length === selectedIds.value.length && query.pageNum > 1) query.pageNum -= 1
    await getList()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '批量删除失败')
  }
}

async function handlePreview(row) {
  previewLoadingId.value = row.id
  try {
    const blob = await downloadFile(row.id)
    previewFile.value = new File([blob], row.originalName || 'preview', {
      type: row.contentType || blob.type || 'application/octet-stream'
    })
    previewVisible.value = true
  } catch (error) {
    ElMessage.error(error?.message || '文件预览失败')
  } finally {
    previewLoadingId.value = null
  }
}

async function handleDownload(row) {
  try {
    const blob = await downloadFile(row.id)
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = row.originalName || 'download'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  } catch (error) {
    ElMessage.error(error?.message || '文件下载失败')
  }
}

onMounted(getList)
</script>

<style scoped>
.page-container { padding: 20px; background: #fff; border-radius: 4px; }
.action-bar { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.upload-tip { color: #909399; font-size: 12px; }
.hidden-input { display: none; }
.file-name-cell { display: flex; align-items: center; gap: 8px; }
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; }
.file-preview-viewer { height: 70vh; min-height: 520px; }
</style>
