<template>
  <div class="login-page">
    <div class="login-card">
      <h2>后台管理系统</h2>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="0">
        <el-form-item prop="username">
          <el-input v-model="form.username" prefix-icon="User" placeholder="请输入用户名" size="large" />
        </el-form-item>
        <el-form-item prop="password">
          <el-input v-model="form.password" prefix-icon="Lock" type="password" placeholder="请输入密码" size="large" show-password @keyup.enter="handleLogin" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" size="large" :loading="loading" style="width: 100%" @click="handleLogin">
            登 录
          </el-button>
        </el-form-item>
      </el-form>
      <p class="tip">请输入有效的系统账号和密码</p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStore } from 'vuex'
import { ElMessage } from 'element-plus'

const route = useRoute()
const router = useRouter()
const store = useStore()
const formRef = ref(null)
const loading = ref(false)

const form = reactive({ username: '', password: '' })
const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

async function handleLogin() {
  try {
    await formRef.value.validate()
  } catch {
    return
  }
  loading.value = true
  try {
    await store.dispatch('login', { username: form.username, password: form.password })
    await store.dispatch('bootstrap', router)
    ElMessage.success('登录成功')
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : ''
    await router.replace(redirect || store.getters.firstAccessiblePath)
  } catch (error) {
    ElMessage.error(error?.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--theme-bg-deep);
}
.login-card {
  width: 400px;
  padding: 40px;
  background: var(--theme-bg);
  border: 1px solid var(--theme-border);
  border-radius: 12px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.28);
}
.login-card h2 {
  text-align: center;
  margin-bottom: 30px;
  color: var(--theme-text-bright);
}
.tip {
  text-align: center;
  font-size: 12px;
  color: var(--theme-text-dim);
  margin-top: 12px;
}
</style>
