<script setup>
import { reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { login, ownerLogin } from '../store'

const emit = defineEmits(['logged-in'])

const form = reactive({ username: '', password: '' })
const loading = ref(false)
const ownerVisible = ref(false)
const ownerForm = reactive({ passphrase: '' })
const ownerLoading = ref(false)

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

async function submitOwner() {
  if (!ownerForm.passphrase.trim()) {
    ElMessage.warning('请输入所有者口令')
    return
  }
  ownerLoading.value = true
  const res = await ownerLogin(ownerForm.passphrase)
  ownerLoading.value = false
  if (res.ok) {
    ownerVisible.value = false
    ElMessage.success('已进入最高权限，admin 密码已重置为 admin123')
    emit('logged-in', res.account)
  } else {
    ElMessage.error('所有者口令错误')
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
      <div style="text-align: center; margin-top: 14px">
        <el-button link size="small" type="info" @click="ownerVisible = true">所有者入口（找回最高权限）</el-button>
      </div>
    </div>

    <el-dialog v-model="ownerVisible" title="所有者入口" width="360px" append-to-body>
      <div style="color: #6b7280; font-size: 13px; margin-bottom: 12px">
        输入所有者口令，验证通过后直接进入最高权限，并把 admin 密码重置为 admin123。
      </div>
      <el-input v-model="ownerForm.passphrase" type="password" placeholder="所有者口令" size="large" show-password @keyup.enter="submitOwner" />
      <template #footer>
        <el-button @click="ownerVisible = false">取消</el-button>
        <el-button type="primary" :loading="ownerLoading" @click="submitOwner">进入</el-button>
      </template>
    </el-dialog>
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
