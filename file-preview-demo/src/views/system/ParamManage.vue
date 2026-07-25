<template>
  <div class="page-container">
    <!-- 搜索 -->
    <el-form :model="query" inline>
      <el-form-item label="参数名称">
        <el-input v-model="query.paramName" placeholder="请输入" clearable />
      </el-form-item>
      <el-form-item label="参数键名">
        <el-input v-model="query.paramKey" placeholder="请输入" clearable />
      </el-form-item>
      <el-form-item label="参数类型">
        <el-select v-model="query.paramType" placeholder="请选择" clearable style="width: 120px">
          <el-option label="系统内置" value="Y" />
          <el-option label="自定义" value="N" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="search">搜索</el-button>
        <el-button icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <div style="margin-bottom: 12px">
      <el-button v-permission="'system:param:add'" type="primary" icon="Plus" @click="handleAdd">新增参数</el-button>
    </div>

    <!-- 表格 -->
    <el-table v-loading="loading" :data="tableData" border stripe>
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="paramName" label="参数名称" min-width="160" show-overflow-tooltip />
      <el-table-column prop="paramKey" label="参数键名" min-width="180" show-overflow-tooltip />
      <el-table-column prop="paramValue" label="参数键值" min-width="160" show-overflow-tooltip />
      <el-table-column prop="paramType" label="参数类型" width="100" align="center">
        <template #default="{ row }">
          <el-tag :type="row.paramType === 'Y' ? 'primary' : 'info'">
            {{ row.paramType === 'Y' ? '系统内置' : '自定义' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
      <el-table-column prop="createTime" label="创建时间" width="170" align="center" />
      <el-table-column label="操作" width="150" fixed="right" align="center">
        <template #default="{ row }">
          <el-button v-permission="'system:param:edit'" link type="primary" icon="Edit" @click="handleEdit(row)">编辑</el-button>
          <el-button v-permission="'system:param:delete'" link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div style="margin-top: 16px; display: flex; justify-content: flex-end">
      <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
        :total="total" :page-sizes="[10, 20, 50]" background layout="total, sizes, prev, pager, next, jumper"
        @size-change="getList" @current-change="getList" />
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑参数' : '新增参数'" width="550px" :close-on-click-modal="false" @close="handleClose">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="参数名称" prop="paramName">
          <el-input v-model="form.paramName" placeholder="请输入参数名称" />
        </el-form-item>
        <el-form-item label="参数键名" prop="paramKey">
          <el-input v-model="form.paramKey" placeholder="请输入参数键名" />
        </el-form-item>
        <el-form-item label="参数键值" prop="paramValue">
          <el-input v-model="form.paramValue" placeholder="请输入参数键值" />
        </el-form-item>
        <el-form-item label="参数类型" prop="paramType">
          <el-radio-group v-model="form.paramType">
            <el-radio value="Y">系统内置</el-radio>
            <el-radio value="N">自定义</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="3" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button v-permission="isEdit ? 'system:param:edit' : 'system:param:add'" type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createParam, deleteParam, getParamList, updateParam } from '@/api/param'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const query = reactive({ paramName: '', paramKey: '', paramType: '', pageNum: 1, pageSize: 10 })

async function getList() {
  loading.value = true
  try {
    const result = await getParamList(query)
    tableData.value = result?.list || []
    total.value = result?.total || 0
  } catch (error) {
    ElMessage.error(error?.message || '获取参数列表失败')
  } finally {
    loading.value = false
  }
}
function search() { query.pageNum = 1; getList() }
function reset() { Object.assign(query, { paramName: '', paramKey: '', paramType: '', pageNum: 1 }); getList() }

const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)
const currentId = ref(null)
const isEdit = computed(() => currentId.value !== null)
const defaultForm = { paramName: '', paramKey: '', paramValue: '', paramType: 'Y', valueType: 'string', remark: '' }
const form = reactive({ ...defaultForm })
const rules = {
  paramName: [{ required: true, message: '请输入参数名称', trigger: 'blur' }],
  paramKey: [{ required: true, message: '请输入参数键名', trigger: 'blur' }],
  paramValue: [{ required: true, message: '请输入参数键值', trigger: 'blur' }],
  paramType: [{ required: true, message: '请选择参数类型', trigger: 'change' }],
}

function handleAdd() {
  currentId.value = null; Object.assign(form, { ...defaultForm }); dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}
function handleEdit(row) {
  currentId.value = row.id; Object.assign(form, { ...defaultForm, ...row }); dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}
function handleClose() { Object.assign(form, { ...defaultForm }); currentId.value = null }

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitLoading.value = true
  try {
    const data = {
      paramName: form.paramName,
      paramKey: form.paramKey,
      paramValue: form.paramValue,
      paramType: form.paramType,
      valueType: form.valueType,
      remark: form.remark || null,
    }
    if (isEdit.value) await updateParam(currentId.value, data)
    else await createParam(data)
    ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
    dialogVisible.value = false
    await getList()
  } catch (error) {
    ElMessage.error(error?.message || '保存参数失败')
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除参数「${row.paramName}」？`, '提示', { type: 'warning' })
    await deleteParam(row.id)
    ElMessage.success('删除成功')
    await getList()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '删除参数失败')
  }
}

onMounted(getList)
</script>

<style scoped>
.page-container { padding: 20px; background: #fff; border-radius: 4px; }
</style>
