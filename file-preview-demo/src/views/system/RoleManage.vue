<template>
  <div class="page-container">
    <el-form :model="query" inline>
      <el-form-item label="角色名称">
        <el-input v-model="query.roleName" placeholder="请输入" clearable />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="search">搜索</el-button>
        <el-button icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <div style="margin-bottom: 12px">
      <el-button v-permission="'system:role:add'" type="primary" icon="Plus" @click="handleAdd">新增角色</el-button>
    </div>

    <el-table v-loading="loading" :data="tableData" border stripe>
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="roleName" label="角色名称" width="160" />
      <el-table-column prop="roleKey" label="角色标识" width="160" />
      <el-table-column prop="sort" label="排序" width="80" align="center" />
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === '1' ? 'success' : 'info'">{{ row.status === '1' ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="remark" label="备注" min-width="200" show-overflow-tooltip />
      <el-table-column prop="createTime" label="创建时间" width="170" align="center" />
      <el-table-column label="操作" width="200" fixed="right" align="center">
        <template #default="{ row }">
          <el-button v-permission="'system:role:edit'" link type="primary" icon="Edit" @click="handleEdit(row)">编辑</el-button>
          <el-button v-permission="'system:role:permission'" link type="primary" icon="Setting" @click="handlePermission(row)">权限</el-button>
          <el-button v-permission="'system:role:delete'" link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-top: 16px; display: flex; justify-content: flex-end">
      <el-pagination v-model:current-page="query.pageNum" v-model:page-size="query.pageSize"
        :total="total" background layout="total, prev, pager, next" @current-change="getList" />
    </div>

    <!-- 新增/编辑 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑角色' : '新增角色'" width="500px" :close-on-click-modal="false" @close="handleClose">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="角色名称" prop="roleName">
          <el-input v-model="form.roleName" placeholder="请输入角色名称" />
        </el-form-item>
        <el-form-item label="角色标识" prop="roleKey">
          <el-input v-model="form.roleKey" placeholder="请输入角色标识" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="1">启用</el-radio>
            <el-radio value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button v-permission="isEdit ? 'system:role:edit' : 'system:role:add'" type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 权限分配 -->
    <el-dialog v-model="permDialogVisible" title="分配权限" width="400px" :close-on-click-modal="false">
      <el-tree
        ref="treeRef"
        :data="menuTree"
        show-checkbox
        check-strictly
        node-key="id"
        :default-checked-keys="checkedKeys"
        :props="{ children: 'children', label: 'menuName' }"
      />
      <template #footer>
        <el-button @click="permDialogVisible = false">取消</el-button>
        <el-button v-permission="'system:role:permission'" type="primary" :loading="permLoading" @click="handleSavePermission">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createRole, deleteRole, getRoleList, getRolePermissions, updateRole, updateRolePermissions } from '@/api/role'
import { getMenuTree } from '@/api/menu'

const loading = ref(false)
const tableData = ref([])
const total = ref(0)
const query = reactive({ roleName: '', pageNum: 1, pageSize: 10 })

async function getList() {
  loading.value = true
  try {
    const result = await getRoleList(query)
    tableData.value = (result?.list || []).map(item => ({ ...item, status: String(item.status) }))
    total.value = result?.total || 0
  } catch (error) {
    ElMessage.error(error?.message || '获取角色列表失败')
  } finally {
    loading.value = false
  }
}
function search() { query.pageNum = 1; getList() }
function reset() { query.roleName = ''; search() }

const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)
const currentId = ref(null)
const isEdit = computed(() => currentId.value !== null)
const defaultForm = { roleName: '', roleKey: '', dataScope: 1, sort: 0, status: '1', remark: '' }
const form = reactive({ ...defaultForm })
const rules = {
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  roleKey: [{ required: true, message: '请输入角色标识', trigger: 'blur' }],
}
function handleAdd() { currentId.value = null; Object.assign(form, { ...defaultForm }); dialogVisible.value = true; nextTick(() => formRef.value?.clearValidate()) }
function handleEdit(row) { currentId.value = row.id; Object.assign(form, { ...defaultForm, ...row, status: String(row.status) }); dialogVisible.value = true; nextTick(() => formRef.value?.clearValidate()) }
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
      roleName: form.roleName,
      roleKey: form.roleKey,
      dataScope: Number(form.dataScope),
      sort: Number(form.sort),
      status: Number(form.status),
      remark: form.remark || null,
    }
    if (isEdit.value) await updateRole(currentId.value, data)
    else await createRole(data)
    ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
    dialogVisible.value = false
    await getList()
  } catch (error) {
    ElMessage.error(error?.message || '保存角色失败')
  } finally {
    submitLoading.value = false
  }
}
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除角色「${row.roleName}」？`, '提示', { type: 'warning' })
    await deleteRole(row.id)
    ElMessage.success('删除成功')
    await getList()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '删除角色失败')
  }
}

const permDialogVisible = ref(false)
const permLoading = ref(false)
const treeRef = ref(null)
const checkedKeys = ref([])
const menuTree = ref([])
const permissionRoleId = ref(null)
async function handlePermission(row) {
  permissionRoleId.value = row.id
  permLoading.value = true
  try {
    const [menus, menuIds] = await Promise.all([getMenuTree(), getRolePermissions(row.id)])
    menuTree.value = menus || []
    checkedKeys.value = menuIds || []
    permDialogVisible.value = true
    nextTick(() => treeRef.value?.setCheckedKeys(checkedKeys.value))
  } catch (error) {
    ElMessage.error(error?.message || '获取角色权限失败')
  } finally {
    permLoading.value = false
  }
}
async function handleSavePermission() {
  if (!permissionRoleId.value) return
  permLoading.value = true
  try {
    const menuIds = treeRef.value.getCheckedKeys()
    await updateRolePermissions(permissionRoleId.value, menuIds)
    ElMessage.success('权限保存成功')
    permDialogVisible.value = false
  } catch (error) {
    ElMessage.error(error?.message || '保存角色权限失败')
  } finally {
    permLoading.value = false
  }
}

onMounted(() => getList())
</script>

<style scoped>
.page-container { padding: 20px; background: #fff; border-radius: 4px; }
</style>
