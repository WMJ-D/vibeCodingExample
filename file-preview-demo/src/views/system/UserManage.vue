<template>
  <div class="page-container">
    <!-- 搜索 -->
    <el-form :model="query" inline>
      <el-form-item label="用户名">
        <el-input v-model="query.username" placeholder="请输入" clearable />
      </el-form-item>
      <el-form-item label="手机号">
        <el-input v-model="query.phone" placeholder="请输入" clearable />
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.status" placeholder="请选择" clearable style="width: 120px">
          <el-option label="启用" value="1" />
          <el-option label="禁用" value="0" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="search">搜索</el-button>
        <el-button icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <div style="margin-bottom: 12px">
      <el-button type="primary" icon="Plus" @click="handleAdd">新增用户</el-button>
    </div>

    <!-- 表格 -->
    <el-table v-loading="loading" :data="tableData" border stripe>
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="username" label="用户名" width="120" />
      <el-table-column prop="nickname" label="昵称" width="120" />
      <el-table-column prop="phone" label="手机号" width="140" />
      <el-table-column prop="email" label="邮箱" min-width="180" show-overflow-tooltip />
      <el-table-column prop="orgName" label="所属组织" width="140" />
      <el-table-column prop="roleName" label="角色" width="120" />
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-switch v-model="row.status" active-value="1" inactive-value="0" @change="handleStatusChange(row)" />
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="170" align="center" />
      <el-table-column label="操作" width="180" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" icon="Edit" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="primary" icon="Key" @click="handleResetPwd(row)">重置</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
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
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '新增用户'" width="550px" :close-on-click-modal="false" @close="handleClose">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" :disabled="isEdit" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入手机号" />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="所属组织">
          <el-input v-model="form.orgName" placeholder="请选择组织" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.roleName" placeholder="请选择角色" style="width: 100%">
            <el-option label="超级管理员" value="超级管理员" />
            <el-option label="普通用户" value="普通用户" />
            <el-option label="编辑" value="编辑" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="1">启用</el-radio>
            <el-radio value="0">禁用</el-radio>
          </el-radio-group>
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

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const query = reactive({ username: '', phone: '', status: '', pageNum: 1, pageSize: 10 })

const mockUsers = Array.from({ length: 46 }, (_, i) => ({
  id: i + 1,
  username: `user${i + 1}`,
  nickname: ['张三', '李四', '王五', '赵六', '孙七', '周八'][i % 6],
  phone: `138${String(10000000 + i).slice(0, 8)}`,
  email: `user${i + 1}@example.com`,
  orgName: ['技术部', '产品部', '运营部', '市场部'][i % 4],
  roleName: ['超级管理员', '普通用户', '编辑'][i % 3],
  status: i % 5 === 0 ? '0' : '1',
  createTime: '2026-03-' + String(1 + (i % 28)).padStart(2, '0') + ' 10:00:00',
}))

async function getList() {
  loading.value = true
  await new Promise(r => setTimeout(r, 300))
  let filtered = mockUsers.filter(u => {
    if (query.username && !u.username.includes(query.username)) return false
    if (query.phone && !u.phone.includes(query.phone)) return false
    if (query.status && u.status !== query.status) return false
    return true
  })
  total.value = filtered.length
  const start = (query.pageNum - 1) * query.pageSize
  tableData.value = filtered.slice(start, start + query.pageSize)
  loading.value = false
}
function search() { query.pageNum = 1; getList() }
function reset() { Object.assign(query, { username: '', phone: '', status: '', pageNum: 1 }); getList() }

// 弹窗
const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)
const currentId = ref(null)
const isEdit = computed(() => !!currentId.value)
const defaultForm = { username: '', nickname: '', phone: '', email: '', orgName: '', roleName: '', status: '1' }
const form = reactive({ ...defaultForm })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
}

function handleAdd() {
  currentId.value = null; Object.assign(form, { ...defaultForm }); dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}
function handleEdit(row) {
  currentId.value = row.id; Object.assign(form, row); dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}
function handleClose() { Object.assign(form, { ...defaultForm }); currentId.value = null }

async function handleSubmit() {
  await formRef.value.validate()
  submitLoading.value = true
  await new Promise(r => setTimeout(r, 300))
  ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
  dialogVisible.value = false; submitLoading.value = false; getList()
}

async function handleDelete(row) {
  await ElMessageBox.confirm(`确认删除用户「${row.username}」？`, '提示', { type: 'warning' })
  ElMessage.success('删除成功'); getList()
}
function handleResetPwd(row) {
  ElMessageBox.confirm(`确认重置用户「${row.username}」的密码？`, '提示', { type: 'warning' })
    .then(() => ElMessage.success('密码已重置为 123456'))
}
function handleStatusChange(row) {
  ElMessage.success(`用户「${row.username}」已${row.status === '1' ? '启用' : '禁用'}`)
}

onMounted(() => getList())
</script>

<style scoped>
.page-container { padding: 20px; background: #fff; border-radius: 4px; }
</style>
