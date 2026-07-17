<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <el-icon :size="48" color="#409eff"><Monitor /></el-icon>
        <h2>欢迎来到高端电竞馆</h2>
        <p>请登录后开始使用</p>
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
              <el-button @click="sendCode" :disabled="countdown > 0">
                {{ countdown > 0 ? `${countdown}s` : '获取验证码' }}
              </el-button>
            </template>
          </el-input>
        </el-form-item>
        
        <el-form-item>
          <el-button type="primary" size="large" style="width: 100%" @click="handleLogin">
            登录 / 注册
          </el-button>
        </el-form-item>
      </el-form>
      
      <div class="login-footer">
        <el-divider>或</el-divider>
        <el-button size="large" style="width: 100%" @click="handleWechatLogin">
          <el-icon><ChatDotRound /></el-icon> 微信扫码登录
        </el-button>
      </div>
      
      <div class="back-home">
        <el-button text @click="$router.push('/')">返回首页</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

const form = ref({
  phone: '',
  code: '',
})

const countdown = ref(0)

const sendCode = () => {
  if (!form.value.phone) {
    ElMessage.warning('请输入手机号')
    return
  }
  
  countdown.value = 60
  const timer = setInterval(() => {
    countdown.value--
    if (countdown.value <= 0) {
      clearInterval(timer)
    }
  }, 1000)
  
  ElMessage.success('验证码已发送')
}

const handleLogin = async () => {
  if (!form.value.phone) {
    ElMessage.warning('请输入手机号')
    return
  }
  
  try {
    await userStore.loginByPhone(form.value.phone)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (error) {
    ElMessage.error('登录失败')
  }
}

const handleWechatLogin = () => {
  ElMessage.info('微信登录功能开发中')
}
</script>

<style scoped lang="scss">
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
    color: #fff;
  }
  
  p {
    color: #909399;
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
