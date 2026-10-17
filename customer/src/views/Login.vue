<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <el-icon :size="48" color="#536953"><Monitor /></el-icon>
        <h2>欢迎来到网吧 X</h2>
        <p>登录后选座，开启这一局</p>
        <p v-if="demoMode" class="demo-note">本地仿真 · 不发送短信<br>演示账号 13800138001 · 验证码 123456</p>
      </div>

      <el-form :model="form" @submit.prevent="handleLogin">
        <el-form-item>
          <el-input
            v-model="form.phone"
            placeholder="请输入手机号"
            prefix-icon="Iphone"
            size="large"
          />
        </el-form-item>

        <el-form-item>
          <el-input
            v-model="form.code"
            placeholder="验证码"
            prefix-icon="Lock"
            size="large"
          >
            <template #append>
              <el-button @click="sendCode" :disabled="!demoMode">
                {{ demoMode ? '填入演示码' : '短信暂未接入' }}
              </el-button>
            </template>
          </el-input>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" size="large" style="width: 100%" :loading="loggingIn" :disabled="!demoMode" native-type="submit">
            登录 / 注册
          </el-button>
        </el-form-item>
      </el-form>

      <div class="login-footer">
        <el-divider>或</el-divider>
        <el-button size="large" style="width: 100%" disabled>
          <el-icon><ChatDotRound /></el-icon> 微信登录暂未开放
        </el-button>
      </div>

      <div class="back-home">
        <el-button text @click="$router.push('/')">返回首页</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import api from '@/api'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const form = ref({
  phone: '',
  code: '',
})

const demoMode = ref(false)
const loggingIn = ref(false)
onMounted(async () => {
  try {
    const health = await api.get('/health')
    demoMode.value = health.mode === 'demo'
    if (demoMode.value) form.value.phone = health.demoPhone
  } catch { ElMessage.error('后端尚未连接，请先启动本地仿真服务') }
})
const sendCode = () => {
  if (demoMode.value) { form.value.code = '123456'; ElMessage.info('已填入本地演示验证码，未发送短信') }
}

const handleLogin = async () => {
  if (loggingIn.value) return
  if (!/^1[3-9]\d{9}$/.test(form.value.phone)) { ElMessage.warning('请输入有效的11位手机号'); return }
  if (!form.value.code) { ElMessage.warning('请输入验证码'); return }
  loggingIn.value = true
  try {
    await userStore.loginByPhone(form.value.phone, form.value.code)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (error: any) { ElMessage.error(error?.message || '登录失败') }
  finally { loggingIn.value = false }
}

</script>

<style scoped lang="scss">
.demo-note { padding:12px; border:1px dashed var(--rule); background:var(--paper); font-size:12px; line-height:1.9; margin-top:16px; }

.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  padding: 40px 30px;
  backdrop-filter: blur(10px);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;

  h2 {
    margin: 16px 0 8px;
    font-size: 22px;
    color: var(--ink);
  }

  p {
    color: #77796b;
    font-size: 14px;
  }
}

.login-footer {
  margin-top: 20px;
}

.back-home {
  text-align: center;
  margin-top: 20px;
}
</style>
