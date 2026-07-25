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
      <el-button v-permission="'system:user:add'" type="primary" icon="Plus" @click="handleAdd">新增用户</el-button>
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
          <el-switch v-permission="'system:user:change-status'" v-model="row.status" active-value="1" inactive-value="0" @change="handleStatusChange(row)" />
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="170" align="center" />
      <el-table-column label="操作" width="180" fixed="right" align="center">
        <template #default="{ row }">
          <el-button v-permission="'system:user:edit'" link type="primary" icon="Edit" @click="handleEdit(row)">编辑</el-button>
          <el-button v-permission="'system:user:reset-password'" link type="primary" icon="Key" @click="handleResetPwd(row)">重置</el-button>
          <el-button v-permission="'system:user:delete'" link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
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
          <el-tree-select v-model="form.orgId" :data="orgOptions" node-key="id"
            :props="{ value: 'id', label: 'orgName', children: 'children' }" check-strictly clearable
            placeholder="请选择组织" style="width: 100%" />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.roleIds" multiple placeholder="请选择角色" style="width: 100%">
            <el-option v-for="role in roleOptions" :key="role.id" :label="role.roleName" :value="role.id" />
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
        <el-button v-permission="isEdit ? 'system:user:edit' : 'system:user:add'" type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createUser, deleteUser, getUser, getUserList, resetUserPassword, updateUser, updateUserStatus } from '@/api/user'
import { getOrgTree } from '@/api/org'
import { getRoleList } from '@/api/role'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const orgOptions = ref([])
const roleOptions = ref([])
const query = reactive({ username: '', phone: '', status: '', pageNum: 1, pageSize: 10 })

async function getList() {
  loading.value = true
  try {
    const result = await getUserList(query)
    tableData.value = (result?.list || []).map(item => ({ ...item, status: String(item.status) }))
    total.value = result?.total || 0
  } catch (error) {
    ElMessage.error(error?.message || '获取用户列表失败')
  } finally {
    loading.value = false
  }
}
function search() { query.pageNum = 1; getList() }
function reset() { Object.assign(query, { username: '', phone: '', status: '', pageNum: 1 }); getList() }

const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)
const currentId = ref(null)
const isEdit = computed(() => currentId.value !== null)
const defaultForm = { username: '', nickname: '', phone: '', email: '', orgId: null, roleIds: [], status: '1' }
const form = reactive({ ...defaultForm })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  nickname: [{ required: true, message: '请输入昵称', trigger: 'blur' }],
  phone: [{ required: true, message: '请输入手机号', trigger: 'blur' }],
}

async function loadOptions() {
  try {
    const orgs = await getOrgTree()
    const roles = []
    let pageNum = 1
    let totalRoles = 0
    do {
      const result = await getRoleList({ pageNum, pageSize: 100, status: 1 })
      roles.push(...(result?.list || []))
      totalRoles = Number(result?.total) || roles.length
      pageNum += 1
    } while (roles.length < totalRoles)
    orgOptions.value = orgs || []
    roleOptions.value = roles.map(item => ({ ...item, id: Number(item.id) }))
  } catch (error) {
    ElMessage.error(error?.message || '获取组织和角色选项失败')
  }
}

function handleAdd() {
  currentId.value = null
  Object.assign(form, { ...defaultForm, roleIds: [] })
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}
async function handleEdit(row) {
  currentId.value = row.id
  dialogVisible.value = true
  try {
    const detail = await getUser(row.id)
    Object.assign(form, { ...defaultForm, ...detail, status: String(detail.status), roleIds: detail.roleIds || [] })
    nextTick(() => formRef.value?.clearValidate())
  } catch (error) {
    dialogVisible.value = false
    ElMessage.error(error?.message || '获取用户详情失败')
  }
}
function handleClose() { Object.assign(form, { ...defaultForm, roleIds: [] }); currentId.value = null }

async function handleSubmit() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  submitLoading.value = true
  try {
    const data = {
      username: form.username,
      nickname: form.nickname,
      phone: form.phone || null,
      email: form.email || null,
      orgId: form.orgId || null,
      roleIds: form.roleIds || [],
      status: Number(form.status),
    }
    if (isEdit.value) await updateUser(currentId.value, data)
    else await createUser(data)
    ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
    dialogVisible.value = false
    await getList()
  } catch (error) {
    ElMessage.error(error?.message || '保存用户失败')
  } finally {
    submitLoading.value = false
  }
}

async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除用户「${row.username}」？`, '提示', { type: 'warning' })
    await deleteUser(row.id)
    ElMessage.success('删除成功')
    await getList()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '删除用户失败')
  }
}
async function handleResetPwd(row) {
  try {
    await ElMessageBox.confirm(`确认重置用户「${row.username}」的密码？`, '提示', { type: 'warning' })
    await resetUserPassword(row.id, '123456')
    ElMessage.success('密码已重置为 123456')
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '重置密码失败')
  }
}
async function handleStatusChange(row) {
  const previous = row.status === '1' ? '0' : '1'
  try {
    await updateUserStatus(row.id, Number(row.status))
    ElMessage.success(`用户「${row.username}」已${row.status === '1' ? '启用' : '禁用'}`)
  } catch (error) {
    row.status = previous
    ElMessage.error(error?.message || '修改用户状态失败')
  }
}

onMounted(() => {
  getList()
  loadOptions()
})
</script>

<style scoped>
.page-container { padding: 20px; background: #fff; border-radius: 4px; }
</style>
