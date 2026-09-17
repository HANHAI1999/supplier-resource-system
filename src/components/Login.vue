<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { login } from '../store'

const emit = defineEmits(['logged-in'])

const form = reactive({ username: '', password: '' })
const loading = ref(false)

function submit() {
  if (!form.username.trim() || !form.password) {
    ElMessage.warning('请输入用户名和密码')
    return
  }
  loading.value = true
  const res = login(form.username, form.password)
  loading.value = false
  if (res.ok) {
    ElMessage.success(`欢迎，${res.member.username}`)
    emit('logged-in', res.account)
  } else {
    ElMessage.error('用户名或密码错误')
  }
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-title">联宇资源池</div>
      <div class="login-sub">请使用分配给你的账号登录</div>
      <el-form @submit.prevent="submit">
        <el-form-item>
          <el-input v-model="form.username" placeholder="用户名" size="large" />
        </el-form-item>
        <el-form-item>
          <el-input v-model="form.password" type="password" placeholder="密码" size="large" show-password @keyup.enter="submit" />
        </el-form-item>
        <el-button type="primary" size="large" style="width: 100%" :loading="loading" @click="submit">
          登录
        </el-button>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}
.login-card {
  width: 360px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 32px 28px;
}
.login-title {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  text-align: center;
}
.login-sub {
  font-size: 12px;
  color: #9ca3af;
  text-align: center;
  margin: 6px 0 20px;
}
</style>
