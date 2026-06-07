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
      <el-button type="primary" icon="Plus" @click="handleAdd">新增参数</el-button>
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
          <el-button link type="primary" icon="Edit" @click="handleEdit(row)">编辑</el-button>
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
const query = reactive({ paramName: '', paramKey: '', paramType: '', pageNum: 1, pageSize: 10 })

const mockParams = [
  { id: 1, paramName: '主框架页-默认皮肤样式名称', paramKey: 'sys.index.skinName', paramValue: 'skin-blue', paramType: 'Y', remark: '蓝色 skin-blue、绿色 skin-green、紫色 skin-purple、红色 skin-red、黄色 skin-yellow', createTime: '2026-03-01 10:00:00' },
  { id: 2, paramName: '用户管理-账号初始密码', paramKey: 'sys.user.initPassword', paramValue: '123456', paramType: 'Y', remark: '初始化密码 123456', createTime: '2026-03-01 10:00:00' },
  { id: 3, paramName: '主框架页-侧边栏主题', paramKey: 'sys.index.sideTheme', paramValue: 'theme-dark', paramType: 'Y', remark: '深色主题 theme-dark，浅色主题 theme-light', createTime: '2026-03-02 10:00:00' },
  { id: 4, paramName: '账号自助-是否开启用户注册功能', paramKey: 'sys.account.registerUser', paramValue: 'false', paramType: 'Y', remark: '是否开启注册用户功能（true 开启，false 关闭）', createTime: '2026-03-03 10:00:00' },
  { id: 5, paramName: '用户登录-验证码开关', paramKey: 'sys.login.captchaEnabled', paramValue: 'true', paramType: 'Y', remark: '是否开启验证码功能（true 开启，false 关闭）', createTime: '2026-03-04 10:00:00' },
  { id: 6, paramName: '用户登录-黑名单开关', paramKey: 'sys.login.blacklistEnabled', paramValue: 'false', paramType: 'Y', remark: '是否开启登录黑名单校验（true 开启，false 关闭）', createTime: '2026-03-05 10:00:00' },
  { id: 7, paramName: '文件上传-最大大小限制', paramKey: 'sys.upload.maxSize', paramValue: '50', paramType: 'N', remark: '单位 MB，默认 50MB', createTime: '2026-03-06 10:00:00' },
  { id: 8, paramName: '文件上传-允许的文件类型', paramKey: 'sys.upload.allowTypes', paramValue: 'jpg,png,pdf,doc,xlsx', paramType: 'N', remark: '允许上传的文件后缀，逗号分隔', createTime: '2026-03-07 10:00:00' },
  { id: 9, paramName: '系统通知-邮件发送开关', paramKey: 'sys.notify.emailEnabled', paramValue: 'true', paramType: 'N', remark: '是否启用邮件通知', createTime: '2026-03-08 10:00:00' },
  { id: 10, paramName: '系统通知-短信发送开关', paramKey: 'sys.notify.smsEnabled', paramValue: 'false', paramType: 'N', remark: '是否启用短信通知', createTime: '2026-03-09 10:00:00' },
  { id: 11, paramName: '数据导出-单次最大条数', paramKey: 'sys.export.maxRows', paramValue: '10000', paramType: 'N', remark: '单次导出最大行数限制', createTime: '2026-03-10 10:00:00' },
  { id: 12, paramName: '会话超时时间', paramKey: 'sys.session.timeout', paramValue: '30', paramType: 'Y', remark: '单位分钟，默认 30 分钟', createTime: '2026-03-11 10:00:00' },
]

async function getList() {
  loading.value = true
  await new Promise(r => setTimeout(r, 300))
  let filtered = mockParams.filter(p => {
    if (query.paramName && !p.paramName.includes(query.paramName)) return false
    if (query.paramKey && !p.paramKey.includes(query.paramKey)) return false
    if (query.paramType && p.paramType !== query.paramType) return false
    return true
  })
  total.value = filtered.length
  const start = (query.pageNum - 1) * query.pageSize
  tableData.value = filtered.slice(start, start + query.pageSize)
  loading.value = false
}
function search() { query.pageNum = 1; getList() }
function reset() { Object.assign(query, { paramName: '', paramKey: '', paramType: '', pageNum: 1 }); getList() }

// 弹窗
const dialogVisible = ref(false)
const submitLoading = ref(false)
const formRef = ref(null)
const currentId = ref(null)
const isEdit = computed(() => !!currentId.value)
const defaultForm = { paramName: '', paramKey: '', paramValue: '', paramType: 'Y', remark: '' }
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
  await ElMessageBox.confirm(`确认删除参数「${row.paramName}」？`, '提示', { type: 'warning' })
  ElMessage.success('删除成功'); getList()
}

onMounted(() => getList())
</script>

<style scoped>
.page-container { padding: 20px; background: #fff; border-radius: 4px; }
</style>
