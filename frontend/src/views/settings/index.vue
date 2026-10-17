<template>
  <div class="settings-container">
    <el-card>
      <template #header>
        <span>系统设置</span>
      </template>

      <el-tabs v-model="activeTab">
        <el-tab-pane label="基本设置" name="basic">
          <el-form :model="basicSettings" label-width="120px">
            <el-form-item label="网吧名称">
              <el-input v-model="basicSettings.shopName" />
            </el-form-item>
            <el-form-item label="联系电话">
              <el-input v-model="basicSettings.phone" />
            </el-form-item>
            <el-form-item label="营业时间">
              <el-time-picker v-model="basicSettings.openTime" placeholder="开门时间" value-format="HH:mm" format="HH:mm" />
              <span style="margin: 0 10px">至</span>
              <el-time-picker v-model="basicSettings.closeTime" placeholder="关门时间" value-format="HH:mm" format="HH:mm" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" @click="saveBasicSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="计费设置" name="billing">
          <el-form :model="billingSettings" label-width="120px">
            <el-form-item label="默认费率(元/时)">
              <el-input-number v-model="billingSettings.defaultRate" :min="1" :max="100" />
            </el-form-item>
            <el-form-item label="通宵费率(元)">
              <el-input-number v-model="billingSettings.nightRate" :min="1" :max="100" />
            </el-form-item>
            <el-form-item label="通宵时段">
              <el-time-picker v-model="billingSettings.nightStart" placeholder="开始" value-format="HH:mm" format="HH:mm" />
              <span style="margin: 0 10px">至</span>
              <el-time-picker v-model="billingSettings.nightEnd" placeholder="结束" value-format="HH:mm" format="HH:mm" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" @click="saveBillingSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>

        <el-tab-pane label="告警设置" name="alert">
          <el-form :model="alertSettings" label-width="120px">
            <el-form-item label="心跳超时(秒)">
              <el-input-number v-model="alertSettings.heartbeatTimeout" :min="30" :max="300" />
            </el-form-item>
            <el-form-item label="告警通知方式">
              <el-checkbox-group v-model="alertSettings.notifyMethods">
                <el-checkbox label="popup">弹窗</el-checkbox>
                <el-checkbox label="sound">声音</el-checkbox>
                <el-checkbox label="wechat">微信</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :loading="saving" @click="saveAlertSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { settingApi, type ShopSetting } from '@/api/setting'

const activeTab = ref('basic')
const saving = ref(false)

const basicSettings = reactive({
  shopName: '高端电竞馆',
  phone: '010-12345678',
  openTime: '08:00',
  closeTime: '02:00',
})

const billingSettings = reactive({
  defaultRate: 10,
  nightRate: 30,
  nightStart: '22:00',
  nightEnd: '08:00',
})

const alertSettings = reactive({
  heartbeatTimeout: 60,
  notifyMethods: ['popup', 'sound'] as string[],
})

const applySetting = (s: ShopSetting) => {
  basicSettings.shopName = s.shopName ?? basicSettings.shopName
  basicSettings.phone = s.phone ?? basicSettings.phone
  basicSettings.openTime = s.openTime ?? basicSettings.openTime
  basicSettings.closeTime = s.closeTime ?? basicSettings.closeTime
  billingSettings.defaultRate = Number(s.defaultRate ?? billingSettings.defaultRate)
  billingSettings.nightRate = Number(s.nightRate ?? billingSettings.nightRate)
  billingSettings.nightStart = s.nightStart ?? billingSettings.nightStart
  billingSettings.nightEnd = s.nightEnd ?? billingSettings.nightEnd
  alertSettings.heartbeatTimeout = Number(s.heartbeatTimeout ?? alertSettings.heartbeatTimeout)
  if (s.notifyMethods) {
    alertSettings.notifyMethods = String(s.notifyMethods).split(',').filter(Boolean)
  }
}

const loadSettings = async () => {
  try {
    const s = await settingApi.getSettings()
    applySetting(s)
  } catch {
    // 首次进入时后端可能未初始化，保留默认值
  }
}

const save = async (payload: Partial<ShopSetting>, message: string) => {
  saving.value = true
  try {
    const s = await settingApi.updateSettings(payload)
    applySetting(s)
    ElMessage.success(message)
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const saveBasicSettings = () => {
  save(
    {
      shopName: basicSettings.shopName,
      phone: basicSettings.phone,
      openTime: basicSettings.openTime,
      closeTime: basicSettings.closeTime,
    },
    '基本设置已保存',
  )
}

const saveBillingSettings = () => {
  save(
    {
      defaultRate: billingSettings.defaultRate,
      nightRate: billingSettings.nightRate,
      nightStart: billingSettings.nightStart,
      nightEnd: billingSettings.nightEnd,
    },
    '计费设置已保存',
  )
}

const saveAlertSettings = () => {
  save(
    {
      heartbeatTimeout: alertSettings.heartbeatTimeout,
      notifyMethods: alertSettings.notifyMethods.join(','),
    },
    '告警设置已保存',
  )
}

onMounted(loadSettings)
</script>

<style scoped lang="scss">
.settings-container {
  // 样式
}
</style>
