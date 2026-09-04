<template>
  <div class="page-container">
    <el-tabs v-model="activeTab">
      <!-- 角色管理 -->
      <el-tab-pane label="角色管理" name="role">
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
      </el-tab-pane>

      <!-- 子系统管理 -->
      <el-tab-pane label="子系统管理" name="app">
        <el-form :model="appQuery" inline>
          <el-form-item label="子系统标识">
            <el-input v-model="appQuery.appId" placeholder="请输入" clearable style="width: 160px" />
          </el-form-item>
          <el-form-item label="子系统名称">
            <el-input v-model="appQuery.appName" placeholder="请输入" clearable />
          </el-form-item>
          <el-form-item label="状态">
            <el-select v-model="appQuery.status" placeholder="请选择" clearable style="width: 110px">
              <el-option label="启用" value="1" />
              <el-option label="禁用" value="0" />
            </el-select>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" icon="Search" @click="searchApps">搜索</el-button>
            <el-button icon="Refresh" @click="resetApps">重置</el-button>
          </el-form-item>
        </el-form>

        <div style="margin-bottom: 12px">
          <el-button v-permission="'system:app:add'" type="primary" icon="Plus" @click="handleAppAdd">新增子系统</el-button>
        </div>

        <el-table v-loading="appLoading" :data="appTableData" border stripe>
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="appId" label="子系统标识" width="140">
            <template #default="{ row }">
              <el-tag>{{ row.appId }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="appName" label="子系统名称" min-width="150" />
          <el-table-column prop="baseUrl" label="前端地址" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">{{ row.baseUrl || '—' }}</template>
          </el-table-column>
          <el-table-column prop="sort" label="排序" width="80" align="center" />
          <el-table-column prop="status" label="状态" width="80" align="center">
            <template #default="{ row }">
              <el-tag :type="row.status === '1' ? 'success' : 'info'">{{ row.status === '1' ? '启用' : '禁用' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
          <el-table-column prop="createTime" label="创建时间" width="170" align="center" />
          <el-table-column label="操作" width="150" fixed="right" align="center">
            <template #default="{ row }">
              <el-button v-permission="'system:app:edit'" link type="primary" icon="Edit" @click="handleAppEdit(row)">编辑</el-button>
              <el-button v-permission="'system:app:delete'" link type="danger" icon="Delete" @click="handleAppDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <div style="margin-top: 16px; display: flex; justify-content: flex-end">
          <el-pagination v-model:current-page="appQuery.pageNum" v-model:page-size="appQuery.pageSize"
            :total="appTotal" background layout="total, prev, pager, next" @current-change="loadAppList" />
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 角色新增/编辑 -->
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

    <!-- 角色权限分配 -->
    <el-dialog v-model="permDialogVisible" title="分配权限" width="400px" :close-on-click-modal="false">
      <el-tree
        ref="treeRef"
        :data="menuTree"
        show-checkbox
        check-strictly
        node-key="id"
        :default-checked-keys="checkedKeys"
        :props="{ children: 'children', label: 'menuName', disabled: 'disabled' }"
      />
      <template #footer>
        <el-button @click="permDialogVisible = false">取消</el-button>
        <el-button v-permission="'system:role:permission'" type="primary" :loading="permLoading" @click="handleSavePermission">保存</el-button>
      </template>
    </el-dialog>

    <!-- 子系统新增/编辑 -->
    <el-dialog v-model="appDialogVisible" :title="isAppEdit ? '编辑子系统' : '新增子系统'" width="520px" :close-on-click-modal="false" @close="handleAppClose">
      <el-form ref="appFormRef" :model="appForm" :rules="appRules" label-width="90px">
        <el-form-item label="子系统标识" prop="appId">
          <el-input v-model="appForm.appId" placeholder="如：main（前端 public/config.js 的 appId）" :disabled="isAppEdit" />
        </el-form-item>
        <el-form-item label="子系统名称" prop="appName">
          <el-input v-model="appForm.appName" placeholder="请输入子系统名称" />
        </el-form-item>
        <el-form-item label="前端地址">
          <el-input v-model="appForm.baseUrl" placeholder="如：http://localhost:5174" />
        </el-form-item>
        <el-form-item label="排序">
          <el-input-number v-model="appForm.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="appForm.status">
            <el-radio value="1">启用</el-radio>
            <el-radio value="0">禁用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="appForm.remark" type="textarea" :rows="2" placeholder="请输入" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="appDialogVisible = false">取消</el-button>
        <el-button v-permission="isAppEdit ? 'system:app:edit' : 'system:app:add'" type="primary" :loading="appSubmitLoading" @click="handleAppSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createRole, deleteRole, getRoleList, getRolePermissions, updateRole, updateRolePermissions } from '@/api/role'
import { createApp, deleteApp, getAppList, updateApp } from '@/api/app'
import { getMenuTree } from '@/api/menu'

const activeTab = ref('role')

/* ==================== 角色管理 ==================== */
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

/**
 * 组装按子系统分组的权限树：顶级为子系统（disabled 不可勾选），子级为该系统的菜单树
 */
function buildGroupedMenuTree(menus, apps) {
  const topMenus = menus || []
  const knownAppIds = new Set(apps.map(app => app.appId))
  const groups = apps.map(app => ({
    id: `app_${app.appId}`,
    menuName: app.appName,
    disabled: true,
    children: topMenus.filter(menu => menu.appId === app.appId),
  }))
  const commonMenus = topMenus.filter(menu => !menu.appId)
  if (commonMenus.length) {
    groups.push({ id: 'app_common', menuName: '公共菜单（所有系统）', disabled: true, children: commonMenus })
  }
  const orphanMenus = topMenus.filter(menu => menu.appId && !knownAppIds.has(menu.appId))
  if (orphanMenus.length) {
    groups.push({ id: 'app_orphan', menuName: '未配置子系统', disabled: true, children: orphanMenus })
  }
  return groups.length ? groups : topMenus
}

async function handlePermission(row) {
  permissionRoleId.value = row.id
  permLoading.value = true
  try {
    const [menus, menuIds, appResult] = await Promise.all([
      getMenuTree(),
      getRolePermissions(row.id),
      getAppList({ pageNum: 1, pageSize: 100 }).catch(() => null),
    ])
    const apps = ((appResult?.list) || []).filter(item => item.status === '1' || item.status === 1)
    menuTree.value = buildGroupedMenuTree(menus, apps)
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

/* ==================== 子系统管理 ==================== */
const appLoading = ref(false)
const appTableData = ref([])
const appTotal = ref(0)
const appQuery = reactive({ appId: '', appName: '', status: '', pageNum: 1, pageSize: 10 })

async function loadAppList() {
  appLoading.value = true
  try {
    const result = await getAppList(appQuery)
    appTableData.value = (result?.list || []).map(item => ({ ...item, status: String(item.status) }))
    appTotal.value = result?.total || 0
  } catch (error) {
    ElMessage.error(error?.message || '获取子系统列表失败')
  } finally {
    appLoading.value = false
  }
}
function searchApps() { appQuery.pageNum = 1; loadAppList() }
function resetApps() { Object.assign(appQuery, { appId: '', appName: '', status: '', pageNum: 1 }); loadAppList() }

const appDialogVisible = ref(false)
const appSubmitLoading = ref(false)
const appFormRef = ref(null)
const currentAppId = ref(null)
const isAppEdit = computed(() => currentAppId.value !== null)
const defaultAppForm = { appId: '', appName: '', baseUrl: '', sort: 0, status: '1', remark: '' }
const appForm = reactive({ ...defaultAppForm })
const appRules = {
  appId: [
    { required: true, message: '请输入子系统标识', trigger: 'blur' },
    { pattern: /^[A-Za-z0-9_-]+$/, message: '只能包含字母、数字、下划线和横线', trigger: 'blur' },
  ],
  appName: [{ required: true, message: '请输入子系统名称', trigger: 'blur' }],
}
function handleAppAdd() {
  currentAppId.value = null
  Object.assign(appForm, { ...defaultAppForm })
  appDialogVisible.value = true
  nextTick(() => appFormRef.value?.clearValidate())
}
function handleAppEdit(row) {
  currentAppId.value = row.id
  Object.assign(appForm, { ...defaultAppForm, ...row, status: String(row.status) })
  appDialogVisible.value = true
  nextTick(() => appFormRef.value?.clearValidate())
}
function handleAppClose() { Object.assign(appForm, { ...defaultAppForm }); currentAppId.value = null }
async function handleAppSubmit() {
  try {
    await appFormRef.value.validate()
  } catch {
    return
  }
  appSubmitLoading.value = true
  try {
    const data = {
      appId: trimToNull(appForm.appId),
      appName: trimToNull(appForm.appName),
      baseUrl: trimToNull(appForm.baseUrl),
      sort: Number(appForm.sort),
      status: Number(appForm.status),
      remark: trimToNull(appForm.remark),
    }
    if (isAppEdit.value) await updateApp(currentAppId.value, data)
    else await createApp(data)
    ElMessage.success(isAppEdit.value ? '编辑成功' : '新增成功')
    appDialogVisible.value = false
    await loadAppList()
  } catch (error) {
    ElMessage.error(error?.message || '保存子系统失败')
  } finally {
    appSubmitLoading.value = false
  }
}
function trimToNull(value) { return value && value.trim() ? value.trim() : null }
async function handleAppDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除子系统「${row.appName}」？删除后该系统的菜单关联将失效。`, '提示', { type: 'warning' })
    await deleteApp(row.id)
    ElMessage.success('删除成功')
    await loadAppList()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '删除子系统失败')
  }
}

onMounted(() => { getList(); loadAppList() })
</script>

<style scoped>
.page-container { padding: 20px; background: #fff; border-radius: 4px; }
</style>
