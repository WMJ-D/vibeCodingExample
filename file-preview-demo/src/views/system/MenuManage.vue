<template>
  <div class="page-container">
    <div style="margin-bottom: 12px">
      <el-button type="primary" icon="Plus" @click="handleAdd(null)">新增菜单</el-button>
      <el-button icon="Sort" @click="toggleExpandAll">{{ isExpandAll ? '全部折叠' : '全部展开' }}</el-button>
    </div>

    <el-table v-if="refreshTable" v-loading="loading" :data="menuData" row-key="id"
      :tree-props="{ children: 'children' }" :default-expand-all="isExpandAll" border>
      <el-table-column prop="menuName" label="菜单名称" min-width="160" />
      <el-table-column prop="icon" label="图标" width="80" align="center">
        <template #default="{ row }">
          <el-icon v-if="row.icon"><component :is="row.icon" /></el-icon>
        </template>
      </el-table-column>
      <el-table-column prop="sort" label="排序" width="60" align="center" />
      <el-table-column prop="path" label="路由地址" width="180" show-overflow-tooltip />
      <el-table-column prop="menuType" label="类型" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="{ 'M': '', 'C': 'success', 'F': 'warning' }[row.menuType]" size="small">
            {{ { 'M': '目录', 'C': '菜单', 'F': '按钮' }[row.menuType] }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === '1' ? 'success' : 'info'" size="small">{{ row.status === '1' ? '显示' : '隐藏' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="170" align="center" />
      <el-table-column label="操作" width="240" align="center">
        <template #default="{ row }">
          <el-button link type="primary" icon="Plus" @click="handleAdd(row)" v-if="row.menuType !== 'F'">新增</el-button>
          <el-button link type="primary" icon="Edit" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑菜单' : '新增菜单'" width="600px" :close-on-click-modal="false" @close="handleClose">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="上级菜单">
          <el-input v-model="form.parentName" disabled placeholder="无（顶级菜单）" />
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
          <el-input v-model="form.path" placeholder="请输入路由地址" />
        </el-form-item>
        <el-form-item label="权限标识" v-if="form.menuType === 'F'">
          <el-input v-model="form.permission" placeholder="如：system:user:add" />
        </el-form-item>
        <el-form-item label="状态">
          <el-radio-group v-model="form.status">
            <el-radio value="1">显示</el-radio>
            <el-radio value="0">隐藏</el-radio>
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
const refreshTable = ref(true)
const isExpandAll = ref(true)

const menuData = ref([
  { id: 1, menuName: '首页', icon: 'HomeFilled', sort: 1, path: '/dashboard', menuType: 'M', status: '1', createTime: '2026-01-01 00:00:00', children: [] },
  { id: 2, menuName: '系统管理', icon: 'Setting', sort: 2, path: '/system', menuType: 'M', status: '1', createTime: '2026-01-01 00:00:00', children: [
    { id: 21, menuName: '用户管理', icon: 'User', sort: 1, path: '/system/user', menuType: 'C', status: '1', createTime: '2026-01-01 00:00:00', children: [
      { id: 211, menuName: '新增用户', icon: '', sort: 1, path: '', menuType: 'F', permission: 'system:user:add', status: '1', createTime: '2026-01-01 00:00:00' },
      { id: 212, menuName: '编辑用户', icon: '', sort: 2, path: '', menuType: 'F', permission: 'system:user:edit', status: '1', createTime: '2026-01-01 00:00:00' },
      { id: 213, menuName: '删除用户', icon: '', sort: 3, path: '', menuType: 'F', permission: 'system:user:delete', status: '1', createTime: '2026-01-01 00:00:00' },
    ]},
    { id: 22, menuName: '角色管理', icon: 'UserFilled', sort: 2, path: '/system/role', menuType: 'C', status: '1', createTime: '2026-01-01 00:00:00', children: [] },
    { id: 23, menuName: '菜单管理', icon: 'Menu', sort: 3, path: '/system/menu', menuType: 'C', status: '1', createTime: '2026-01-01 00:00:00', children: [] },
    { id: 24, menuName: '组织管理', icon: 'OfficeBuilding', sort: 4, path: '/system/org', menuType: 'C', status: '1', createTime: '2026-01-01 00:00:00', children: [] },
  ]},
  { id: 3, menuName: '日志管理', icon: 'Document', sort: 3, path: '/log', menuType: 'M', status: '1', createTime: '2026-01-01 00:00:00', children: [
    { id: 31, menuName: '操作日志', icon: 'Document', sort: 1, path: '/log/operation', menuType: 'C', status: '1', createTime: '2026-01-01 00:00:00', children: [] },
    { id: 32, menuName: '登录日志', icon: 'Key', sort: 2, path: '/log/login', menuType: 'C', status: '1', createTime: '2026-01-01 00:00:00', children: [] },
  ]},
])

function toggleExpandAll() {
  isExpandAll.value = !isExpandAll.value
  refreshTable.value = false
  nextTick(() => { refreshTable.value = true })
}

// 弹窗
const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)
const currentId = ref(null)
const isEdit = computed(() => !!currentId.value)
const defaultForm = { menuName: '', menuType: 'M', sort: 0, path: '', permission: '', status: '1', parentName: '' }
const form = reactive({ ...defaultForm })
const rules = {
  menuName: [{ required: true, message: '请输入菜单名称', trigger: 'blur' }],
  menuType: [{ required: true, message: '请选择菜单类型', trigger: 'change' }],
}
function handleAdd(parent) {
  currentId.value = null; Object.assign(form, { ...defaultForm, parentName: parent?.menuName || '无（顶级菜单）' })
  dialogVisible.value = true; nextTick(() => formRef.value?.clearValidate())
}
function handleEdit(row) {
  currentId.value = row.id; Object.assign(form, { ...row, parentName: '' }); dialogVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}
function handleClose() { Object.assign(form, { ...defaultForm }); currentId.value = null }
async function handleSubmit() {
  await formRef.value.validate(); submitLoading.value = true
  await new Promise(r => setTimeout(r, 300))
  ElMessage.success(isEdit.value ? '编辑成功' : '新增成功'); dialogVisible.value = false; submitLoading.value = false
}
async function handleDelete(row) {
  await ElMessageBox.confirm(`确认删除菜单「${row.menuName}」？`, '提示', { type: 'warning' })
  ElMessage.success('删除成功')
}

onMounted(() => { loading.value = false })
</script>

<style scoped>
.page-container { padding: 20px; background: #fff; border-radius: 4px; }
</style>
