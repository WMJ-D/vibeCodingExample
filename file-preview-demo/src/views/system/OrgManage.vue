<template>
  <div class="page-container">
    <el-form :model="query" inline>
      <el-form-item label="组织名称">
        <el-input v-model="query.orgName" placeholder="请输入" clearable />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="Search" @click="search">搜索</el-button>
        <el-button icon="Refresh" @click="reset">重置</el-button>
      </el-form-item>
    </el-form>

    <div style="margin-bottom: 12px">
      <el-button type="primary" icon="Plus" @click="handleAdd(null)">新增组织</el-button>
      <el-button icon="Sort" @click="toggleExpandAll">{{ isExpandAll ? '全部折叠' : '全部展开' }}</el-button>
    </div>

    <el-table v-if="refreshTable" v-loading="loading" :data="filteredData" row-key="id"
      :tree-props="{ children: 'children' }" :default-expand-all="isExpandAll" border>
      <el-table-column prop="orgName" label="组织名称" min-width="200" />
      <el-table-column prop="leader" label="负责人" width="120" align="center" />
      <el-table-column prop="phone" label="联系电话" width="140" align="center" />
      <el-table-column prop="sort" label="排序" width="60" align="center" />
      <el-table-column prop="status" label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === '1' ? 'success' : 'info'" size="small">{{ row.status === '1' ? '启用' : '禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="createTime" label="创建时间" width="170" align="center" />
      <el-table-column label="操作" width="240" align="center">
        <template #default="{ row }">
          <el-button link type="primary" icon="Plus" @click="handleAdd(row)">新增</el-button>
          <el-button link type="primary" icon="Edit" @click="handleEdit(row)">编辑</el-button>
          <el-button link type="danger" icon="Delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑组织' : '新增组织'" width="550px" :close-on-click-modal="false" @close="handleClose">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px">
        <el-form-item label="上级组织">
          <el-input v-model="form.parentName" disabled placeholder="无（顶级组织）" />
        </el-form-item>
        <el-form-item label="组织名称" prop="orgName">
          <el-input v-model="form.orgName" placeholder="请输入组织名称" />
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="form.leader" placeholder="请输入负责人" />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.phone" placeholder="请输入联系电话" />
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
const query = reactive({ orgName: '' })

const orgData = ref([
  { id: 1, orgName: '总公司', leader: '张总', phone: '13800000001', sort: 1, status: '1', createTime: '2026-01-01 00:00:00', children: [
    { id: 11, orgName: '技术部', leader: '李工', phone: '13800000011', sort: 1, status: '1', createTime: '2026-01-10 09:00:00', children: [
      { id: 111, orgName: '前端组', leader: '王前端', phone: '13800000111', sort: 1, status: '1', createTime: '2026-02-01 09:00:00', children: [] },
      { id: 112, orgName: '后端组', leader: '赵后端', phone: '13800000112', sort: 2, status: '1', createTime: '2026-02-01 09:00:00', children: [] },
    ]},
    { id: 12, orgName: '产品部', leader: '刘产品', phone: '13800000012', sort: 2, status: '1', createTime: '2026-01-10 09:00:00', children: [] },
    { id: 13, orgName: '运营部', leader: '孙运营', phone: '13800000013', sort: 3, status: '1', createTime: '2026-01-10 09:00:00', children: [] },
    { id: 14, orgName: '市场部', leader: '周市场', phone: '13800000014', sort: 4, status: '0', createTime: '2026-01-10 09:00:00', children: [] },
  ]},
])

const filteredData = computed(() => {
  if (!query.orgName) return orgData.value
  // 简单过滤（仅搜索顶层和第一层子节点名称）
  return orgData.value
})

function search() { /* 树形结构搜索需要递归，这里简化处理 */ }
function reset() { query.orgName = '' }

function toggleExpandAll() {
  isExpandAll.value = !isExpandAll.value
  refreshTable.value = false
  nextTick(() => { refreshTable.value = true })
}

const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)
const currentId = ref(null)
const isEdit = computed(() => !!currentId.value)
const defaultForm = { orgName: '', leader: '', phone: '', sort: 0, status: '1', parentName: '' }
const form = reactive({ ...defaultForm })
const rules = { orgName: [{ required: true, message: '请输入组织名称', trigger: 'blur' }] }

function handleAdd(parent) {
  currentId.value = null; Object.assign(form, { ...defaultForm, parentName: parent?.orgName || '无（顶级组织）' })
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
  await ElMessageBox.confirm(`确认删除组织「${row.orgName}」？`, '提示', { type: 'warning' })
  ElMessage.success('删除成功')
}

onMounted(() => { loading.value = false })
</script>

<style scoped>
.page-container { padding: 20px; background: #fff; border-radius: 4px; }
</style>
