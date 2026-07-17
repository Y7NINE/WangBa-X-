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
              <el-time-picker v-model="basicSettings.openTime" placeholder="开门时间" />
              <span style="margin: 0 10px">至</span>
              <el-time-picker v-model="basicSettings.closeTime" placeholder="关门时间" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveBasicSettings">保存设置</el-button>
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
              <el-time-picker v-model="billingSettings.nightStart" placeholder="开始" />
              <span style="margin: 0 10px">至</span>
              <el-time-picker v-model="billingSettings.nightEnd" placeholder="结束" />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="saveBillingSettings">保存设置</el-button>
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
              <el-button type="primary" @click="saveAlertSettings">保存设置</el-button>
            </el-form-item>
          </el-form>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

const activeTab = ref('basic')

const basicSettings = ref({
  shopName: '高端电竞馆',
  phone: '010-12345678',
  openTime: new Date(2024, 0, 1, 8, 0),
  closeTime: new Date(2024, 0, 1, 2, 0),
})

const billingSettings = ref({
  defaultRate: 10,
  nightRate: 30,
  nightStart: new Date(2024, 0, 1, 22, 0),
  nightEnd: new Date(2024, 0, 1, 8, 0),
})

const alertSettings = ref({
  heartbeatTimeout: 60,
  notifyMethods: ['popup', 'sound'],
})

const saveBasicSettings = () => {
  ElMessage.success('基本设置已保存')
}

const saveBillingSettings = () => {
  ElMessage.success('计费设置已保存')
}

const saveAlertSettings = () => {
  ElMessage.success('告警设置已保存')
}
</script>

<style scoped lang="scss">
.settings-container {
  // 样式
}
</style>
