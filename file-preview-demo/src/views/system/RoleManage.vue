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
      <el-button type="primary" icon="Plus" @click="handleAdd">新增角色</el-button>
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
          <el-button link type="primary" icon="Edit" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="primary" icon="Setting" @click="handlePermission(row)">权限</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
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
        <el-button type="primary" :loading="submitLoading" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 权限分配 -->
    <el-dialog v-model="permDialogVisible" title="分配权限" width="400px" :close-on-click-modal="false">
      <el-tree
        ref="treeRef"
        :data="menuTree"
        show-checkbox
        node-key="id"
        :default-checked-keys="checkedKeys"
        :props="{ children: 'children', label: 'label' }"
      />
      <template #footer>
        <el-button @click="permDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSavePermission">保存</el-button>
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
const query = reactive({ roleName: '', pageNum: 1, pageSize: 10 })

const mockRoles = [
  { id: 1, roleName: '超级管理员', roleKey: 'admin', sort: 1, status: '1', remark: '拥有所有权限', createTime: '2026-01-01 00:00:00' },
  { id: 2, roleName: '普通用户', roleKey: 'user', sort: 2, status: '1', remark: '基础权限', createTime: '2026-01-15 10:00:00' },
  { id: 3, roleName: '编辑', roleKey: 'editor', sort: 3, status: '1', remark: '内容编辑权限', createTime: '2026-02-01 09:00:00' },
  { id: 4, roleName: '审核员', roleKey: 'auditor', sort: 4, status: '0', remark: '审核权限', createTime: '2026-02-20 14:00:00' },
  { id: 5, roleName: '访客', roleKey: 'guest', sort: 5, status: '1', remark: '只读权限', createTime: '2026-03-10 16:00:00' },
]

async function getList() {
  loading.value = true
  await new Promise(r => setTimeout(r, 300))
  let filtered = mockRoles.filter(r => !query.roleName || r.roleName.includes(query.roleName))
  total.value = filtered.length
  tableData.value = filtered.slice((query.pageNum - 1) * query.pageSize, query.pageNum * query.pageSize)
  loading.value = false
}
function search() { query.pageNum = 1; getList() }
function reset() { query.roleName = ''; search() }

// 弹窗
const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)
const currentId = ref(null)
const isEdit = computed(() => !!currentId.value)
const defaultForm = { roleName: '', roleKey: '', sort: 0, status: '1', remark: '' }
const form = reactive({ ...defaultForm })
const rules = {
  roleName: [{ required: true, message: '请输入角色名称', trigger: 'blur' }],
  roleKey: [{ required: true, message: '请输入角色标识', trigger: 'blur' }],
}
function handleAdd() { currentId.value = null; Object.assign(form, { ...defaultForm }); dialogVisible.value = true; nextTick(() => formRef.value?.clearValidate()) }
function handleEdit(row) { currentId.value = row.id; Object.assign(form, row); dialogVisible.value = true; nextTick(() => formRef.value?.clearValidate()) }
function handleClose() { Object.assign(form, { ...defaultForm }); currentId.value = null }
async function handleSubmit() {
  await formRef.value.validate(); submitLoading.value = true
  await new Promise(r => setTimeout(r, 300))
  ElMessage.success(isEdit.value ? '编辑成功' : '新增成功'); dialogVisible.value = false; submitLoading.value = false; getList()
}
async function handleDelete(row) {
  await ElMessageBox.confirm(`确认删除角色「${row.roleName}」？`, '提示', { type: 'warning' })
  ElMessage.success('删除成功'); getList()
}

// 权限
const permDialogVisible = ref(false)
const treeRef = ref(null)
const checkedKeys = ref([])
const menuTree = [
  { id: 1, label: '首页', children: [] },
  { id: 2, label: '系统管理', children: [
    { id: 21, label: '用户管理' }, { id: 22, label: '角色管理' },
    { id: 23, label: '菜单管理' }, { id: 24, label: '组织管理' },
  ]},
  { id: 3, label: '日志管理', children: [
    { id: 31, label: '操作日志' }, { id: 32, label: '登录日志' },
  ]},
]
function handlePermission(row) { checkedKeys.value = [1, 21, 31]; permDialogVisible.value = true }
function handleSavePermission() { ElMessage.success('权限保存成功'); permDialogVisible.value = false }

onMounted(() => getList())
</script>

<style scoped>
.page-container { padding: 20px; background: #fff; border-radius: 4px; }
</style>
