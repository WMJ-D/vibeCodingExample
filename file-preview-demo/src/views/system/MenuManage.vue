<template>
  <div class="page-container">
    <!-- 子系统切换 -->
    <el-tabs v-model="activeAppTab">
      <el-tab-pane label="全部" name="all" />
      <el-tab-pane
        v-for="app in appOptions"
        :key="app.appId"
        :label="`${app.appName}（${app.appId}）`"
        :name="app.appId"
      />
    </el-tabs>

    <div style="margin-bottom: 12px">
      <el-button v-permission="'system:menu:add'" type="primary" icon="Plus" @click="handleAdd(null)">新增菜单</el-button>
      <el-button icon="Sort" @click="toggleExpandAll">{{ isExpandAll ? '全部折叠' : '全部展开' }}</el-button>
    </div>

    <el-table v-if="refreshTable" v-loading="loading" :data="filteredMenuData" row-key="id"
      :tree-props="{ children: 'children' }" :default-expand-all="isExpandAll" border>
      <el-table-column prop="menuName" label="菜单名称" />
      <el-table-column prop="appName" label="所属系统" min-width="110" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.appId" size="small">{{ row.appName || row.appId }}</el-tag>
          <el-tag v-else size="small" type="info">所有系统</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="icon" label="图标" width="80" align="center">
        <template #default="{ row }">
          <el-icon v-if="row.icon"><component :is="row.icon" /></el-icon>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="60" align="center" />
      <el-table-column prop="path" label="路由地址" width="240" show-overflow-tooltip />
      <el-table-column prop="menuType" label="类型" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="{ 'M': '', 'C': 'success', 'F': 'warning' }[row.menuType]" size="small">
            {{ { 'M': '目录', 'C': '菜单', 'F': '按钮' }[row.menuType] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="visible" label="显示" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="Number(row.visible) === 1 ? 'success' : 'info'" size="small">{{ Number(row.visible) === 1 ? '显示' : '隐藏' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === '1' ? 'success' : 'danger'" size="small">{{ row.status === '1' ? '启用' : '停用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="170" align="center" />
      <el-table-column label="操作" width="240" align="center">
        <template #default="{ row }">
          <el-button v-if="row.menuType !== 'F'" v-permission="'system:menu:add'" link type="primary" icon="Plus" @click="handleAdd(row)">新增</el-button>
          <el-button v-permission="'system:menu:edit'" link type="primary" icon="Edit" @click="handleEdit(row)">编辑</el-button>
          <el-button v-permission="'system:menu:delete'" link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑菜单' : '新增菜单'" width="600px" :close-on-click-modal="false" @close="handleClose">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="上级菜单">
          <el-input v-model="form.parentName" disabled placeholder="无（顶级菜单）" />
        </el-form-item>
        <el-form-item label="所属系统">
          <el-select v-model="form.appId" placeholder="所有系统" clearable style="width: 100%">
            <el-option v-for="app in appOptions" :key="app.appId" :label="app.appName" :value="app.appId" />
          </el-select>
        </el-form-item>
        <el-form-item label="菜单类型" prop="menuType">
          <el-radio-group v-model="form.menuType">
            <el-radio value="M">目录</el-radio>
            <el-radio value="C">菜单</el-radio>
            <el-radio value="F">按钮</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="菜单名称" prop="menuName">
          <el-input v-model="form.menuName" placeholder="请输入菜单名称" />
        </el-form-item>
        <el-form-item label="排序" prop="sort">
          <el-input-number v-model="form.sort" :min="0" :max="999" />
        </el-form-item>
        <el-form-item label="路由地址" v-if="form.menuType !== 'F'">
          <el-input v-model="form.path" placeholder="如：/system/user" />
        </el-form-item>
        <el-form-item label="组件路径" v-if="form.menuType === 'C'">
          <el-input v-model="form.component" placeholder="如：views/system/UserManage.vue" />
        </el-form-item>
        <el-form-item label="路由名称" v-if="form.menuType === 'C'">
          <el-input v-model="form.routeName" placeholder="如：UserManage" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="form.icon" placeholder="Element Plus 图标名称" />
        </el-form-item>
        <el-form-item label="权限标识">
          <el-input v-model="form.permission" placeholder="如：system:user:list" />
        </el-form-item>
        <el-form-item label="是否显示" v-if="form.menuType !== 'F'">
          <el-radio-group v-model="form.visible">
            <el-radio :value="1">显示</el-radio>
            <el-radio :value="0">隐藏</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="页面缓存" v-if="form.menuType === 'C'">
          <el-radio-group v-model="form.keepAlive">
            <el-radio :value="1">缓存</el-radio>
            <el-radio :value="0">不缓存</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="外部链接" v-if="form.menuType === 'C'">
          <el-radio-group v-model="form.externalLink">
            <el-radio :value="0">否</el-radio>
            <el-radio :value="1">是</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="1">启用</el-radio>
            <el-radio value="0">停用</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="请输入备注" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button v-permission="isEdit ? 'system:menu:edit' : 'system:menu:add'" type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, nextTick, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createMenu, deleteMenu, getMenuTree, updateMenu } from '@/api/menu'
import { getAppList } from '@/api/app'

const loading = ref(false)
const refreshTable = ref(true)
const isExpandAll = ref(true)
const menuData = ref([])
const appOptions = ref([])

async function loadApps() {
  try {
    const result = await getAppList({ pageNum: 1, pageSize: 100 })
    appOptions.value = (result?.list || []).filter(item => item.status === '1' || item.status === 1)
  } catch {
    appOptions.value = []
  }
}

async function getList() {
  loading.value = true
  try {
    const data = await getMenuTree()
    menuData.value = normalizeTree(data || [])
  } catch (error) {
    ElMessage.error(error?.message || '获取菜单列表失败')
  } finally {
    loading.value = false
  }
}
function normalizeTree(nodes) {
  return nodes.map(node => ({
    ...node,
    status: String(node.status),
    children: normalizeTree(node.children || []),
  }))
}

/* 子系统 tab 切换：过滤显示当前系统的菜单 */
const activeAppTab = ref('all')
function filterTreeByApp(nodes, appId) {
  if (appId === 'all') return nodes
  const result = []
  for (const node of nodes) {
    const children = filterTreeByApp(node.children || [], appId)
    // 自身属于当前系统、或公共菜单（app_id 为空，所有系统可见）、或子级有匹配节点（作为容器保留）
    if (node.appId === appId || node.appId == null || children.length) {
      result.push({ ...node, children })
    }
  }
  return result
}
const filteredMenuData = computed(() => filterTreeByApp(menuData.value, activeAppTab.value))
// 切换 tab 后重绘表格，让 default-expand-all 重新生效（否则树会呈折叠态）
watch(activeAppTab, () => {
  refreshTable.value = false
  nextTick(() => { refreshTable.value = true })
})
function findMenuName(nodes, id) {
  for (const node of nodes) {
    if (Number(node.id) === Number(id)) return node.menuName
    const name = findMenuName(node.children || [], id)
    if (name) return name
  }
  return ''
}
function toggleExpandAll() {
  isExpandAll.value = !isExpandAll.value
  refreshTable.value = false
  nextTick(() => { refreshTable.value = true })
}

const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)
const currentId = ref(null)
const isEdit = computed(() => currentId.value !== null)
const defaultForm = {
  parentId: null, menuName: '', menuType: 'M', sort: 0, path: '', component: '', routeName: '',
  permission: '', icon: '', visible: 1, status: '1', keepAlive: 1, externalLink: 0, remark: '', parentName: '',
}
const form = reactive({ ...defaultForm })
const rules = {
  menuName: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  menuType: [{ required: true, message: '请选择菜单类型', trigger: 'change' }],
}
function handleAdd(parent) {
  currentId.value = null
  Object.assign(form, {
    ...defaultForm,
    appId: activeAppTab.value !== 'all' ? activeAppTab.value : '',
    parentId: parent?.id || null,
    parentName: parent?.menuName || '无（顶级菜单）',
  })
  dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}
function handleEdit(row) {
  currentId.value = row.id
  Object.assign(form, { ...defaultForm, ...row, status: String(row.status), parentName: findMenuName(menuData.value, row.parentId) || '无（顶级菜单）' })
  dialogVisible.value = true
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
      parentId: form.parentId || null,
      appId: form.appId || null,
      menuName: form.menuName,
      menuType: form.menuType,
      path: form.path || null,
      component: form.component || null,
      routeName: form.routeName || null,
      permission: form.permission || null,
      icon: form.icon || null,
      sort: Number(form.sort),
      visible: Number(form.visible),
      status: Number(form.status),
      keepAlive: Number(form.keepAlive),
      externalLink: Number(form.externalLink),
      remark: form.remark || null,
    }
    if (isEdit.value) await updateMenu(currentId.value, data)
    else await createMenu(data)
    ElMessage.success(isEdit.value ? '编辑成功' : '新增成功')
    dialogVisible.value = false
    await getList()
  } catch (error) {
    ElMessage.error(error?.message || '保存菜单失败')
  } finally {
    submitLoading.value = false
  }
}
async function handleDelete(row) {
  try {
    await ElMessageBox.confirm(`确认删除菜单「${row.menuName}」？`, '提示', { type: 'warning' })
    await deleteMenu(row.id)
    ElMessage.success('删除成功')
    await getList()
  } catch (error) {
    if (error !== 'cancel' && error !== 'close') ElMessage.error(error?.message || '删除菜单失败')
  }
}

onMounted(() => { getList(); loadApps() })
</script>

<style scoped>
.page-container { padding: 20px; background: #fff; border-radius: 4px; }
</style>
