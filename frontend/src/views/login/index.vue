<template>
  <div class="login-container">
    <div class="login-art" aria-hidden="true"><span class="art-caption">网吧 X · 门店手记</span><h2>一席相聚，<br>用心照料。</h2><p>经营有序，来客自在。</p><img src="/ink-landscape.svg" alt="" /></div>
    <div class="login-card">
      <div class="login-header">
        <span class="login-seal" aria-hidden="true">网</span><h1>网吧 X · 工作台</h1>
        <p>登录门店账户，开始今日事务。</p>
      </div>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        class="login-form"
        @submit.prevent="handleLogin"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="请输入用户名"
            prefix-icon="User"
            size="large"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="请输入密码"
            prefix-icon="Lock"
            size="large"
            show-password
            @keyup.enter="handleLogin"
          />
        </el-form-item>

        <el-form-item>
          <el-button
            type="primary"
            size="large"
            :loading="loading"
            class="login-btn"
            @click="handleLogin"
          >
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, FormInstance } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const authStore = useAuthStore()

const formRef = ref<FormInstance>()
const loading = ref(false)

const form = reactive({
  username: '',
  password: '',
})

const rules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }],
}

const handleLogin = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    await authStore.login(form)
    ElMessage.success('登录成功')
    router.push('/')
  } catch (error: any) {
    ElMessage.error(error.message || '登录失败')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped lang="scss">
.login-container { min-height:100vh;display:flex;justify-content:center;align-items:center;background:var(--paper);padding:32px;gap:0; }
.login-art { position:relative;isolation:isolate;width:430px;height:535px;padding:48px 42px;background:var(--paper-deep);border:1px solid var(--rule);overflow:hidden;.art-caption { font:11px var(--font-song);letter-spacing:3px;color:var(--ink-soft); }h2 { position:relative;z-index:1;font:500 37px/1.6 var(--font-song);letter-spacing:5px;margin:37px 0 15px; }p { position:relative;z-index:1;color:var(--ink-muted);font-size:12px;letter-spacing:2px; }img { position:absolute;right:-70px;bottom:-45px;width:450px;max-width:none;z-index:0;opacity:.72; } }
.login-card { width:390px;min-height:535px;padding:48px 40px;background:var(--paper-light);border:1px solid var(--rule);border-left:0; }
.login-header { margin-bottom:32px;h1 { font:500 25px var(--font-song);letter-spacing:2px;margin:20px 0 12px; }p { color:var(--ink-muted);font-size:12px;line-height:1.8; } }
.login-seal { display:grid;place-items:center;width:31px;height:36px;border:1px solid var(--cinnabar);outline:1px solid var(--cinnabar);outline-offset:-4px;font:22px var(--font-song);color:var(--cinnabar);transform:rotate(-3deg); }
.login-form .el-input { height:44px; }.login-btn { width:100%;height:44px;letter-spacing:5px;margin-top:7px; }
@media(max-width:760px) { .login-art { display:none; }.login-container { padding:22px; }.login-card { border-left:1px solid var(--rule);min-height:auto;padding:36px 30px;width:390px;max-width:100%; } }
</style>
