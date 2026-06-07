<!--
 * @Description: 列表页面 - 带搜索、表格、分页、新增/编辑/删除
 * @Author: WangMingJun
 * @Date: 2026-03-23
-->
<template>
  <div class="list-page">
    <!-- 搜索栏 -->
    <el-form :model="queryParams" inline class="search-bar">
      <el-form-item label="名称">
        <el-input v-model="queryParams.name" placeholder="请输入名称" clearable @keyup.enter="handleSearch" />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="queryParams.status" placeholder="请选择" clearable style="width: 140px">
          <el-option label="启用" value="1" />
          <el-option label="禁用" value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 操作栏 -->
    <div class="action-bar">
      <el-button type="primary" :icon="Plus" @click="handleAdd">新增</el-button>
    </div>

    <!-- 表格 -->
    <el-table v-loading="loading" :data="tableData" border stripe style="width: 100%">
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="name" label="名称" min-width="150" show-overflow-tooltip />
      <el-table-column prop="status" label="状态" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === '1' ? 'success' : 'info'">
            {{ row.status === '1' ? '启用' : '禁用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="180" align="center" />
      <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
      <el-table-column label="操作" width="200" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="queryParams.pageNum"
        v-model:page-size="queryParams.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="total"
        background
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="getList"
        @current-change="getList"
      />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑' : '新增'" width="500px" :close-on-click-modal="false" @close="handleDialogClose">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="状态" prop="status">
          <el-radio-group v-model="form.status">
            <el-radio value="1">启用</el-radio>
            <el-radio value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Plus, Edit, Delete } from '@element-plus/icons-vue'

// ==================== 表格相关 ====================
const loading = ref(false)
const tableData = ref([])
const total = ref(0)

const queryParams = reactive({
  name: '',
  status: '',
  pageNum: 1,
  pageSize: 10,
})

/** 获取列表数据 */
async function getList() {
  loading.value = true
  try {
    // TODO: 替换为真实接口
    // const res = await api.getList(queryParams)
    // tableData.value = res.data.list
    // total.value = res.data.total

    // 模拟数据
    await new Promise(r => setTimeout(r, 500))
    const mockData = Array.from({ length: queryParams.pageSize }, (_, i) => {
      const idx = (queryParams.pageNum - 1) * queryParams.pageSize + i + 1
      return {
        id: idx,
        name: `项目${idx}`,
        status: idx % 3 === 0 ? '0' : '1',
        createTime: '2026-03-23 15:00:00',
        remark: `这是第 ${idx} 条数据的备注信息`,
      }
    })
    tableData.value = mockData
    total.value = 86
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  queryParams.pageNum = 1
  getList()
}

function handleReset() {
  queryParams.name = ''
  queryParams.status = ''
  handleSearch()
}

// ==================== 弹窗相关 ====================
const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)
const currentId = ref(null)
const isEdit = computed(() => !!currentId.value)

const defaultForm = { name: '', status: '1', remark: '' }
const form = reactive({ ...defaultForm })

const rules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  status: [{ required: true, message: '请选择状态', trigger: 'change' }],
}

function handleAdd() {
  currentId.value = null
  Object.assign(form, { ...defaultForm })
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

function handleEdit(row) {
  currentId.value = row.id
  Object.assign(form, { name: row.name, status: row.status, remark: row.remark })
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

function handleDialogClose() {
  Object.assign(form, { ...defaultForm })
  currentId.value = null
}

async function handleSubmit() {
  await formRef.value.validate()
  submitLoading.value = true
  try {
    // TODO: 替换为真实接口
    // if (isEdit.value) {
    //   await api.update(currentId.value, form)
    // } else {
    //   await api.create(form)
    // }
    await new Promise(r => setTimeout(r, 300))
    ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
    dialogVisible.value = false
    getList()
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确认删除「${row.name}」？`, '提示', { type: 'warning' })
  // TODO: 替换为真实接口
  // await api.delete(row.id)
  ElMessage.success('删除成功')
  getList()
}

// ==================== 初始化 ====================
onMounted(() => getList())
</script>

<style scoped>
.list-page {
  padding: 20px;
}
.search-bar {
  margin-bottom: 16px;
}
.action-bar {
  margin-bottom: 12px;
}
.pagination-wrap {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
