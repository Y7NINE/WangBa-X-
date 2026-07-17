<template>
  <div class="repair-container">
    <div class="nav-bar">
      <el-button text @click="$router.push('/')">
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <h3>一键报修</h3>
      <div></div>
    </div>

    <div class="repair-form">
      <div class="section-title">故障类型</div>
      <div class="fault-types">
        <div
          v-for="type in faultTypes"
          :key="type.id"
          class="fault-item"
          :class="{ active: selectedType === type.id }"
          @click="selectedType = type.id"
        >
          <el-icon :size="24"><component :is="type.icon" /></el-icon>
          <span>{{ type.name }}</span>
        </div>
      </div>

      <div class="section-title">问题描述</div>
      <el-input
        v-model="description"
        type="textarea"
        :rows="3"
        placeholder="请描述您遇到的问题（可选）"
      />

      <div class="section-title">处理方式</div>
      <el-radio-group v-model="action" class="action-group">
        <el-radio-button label="wait">等待维修</el-radio-button>
        <el-radio-button label="change">申请换机</el-radio-button>
      </el-radio-group>

      <el-button
        type="primary"
        size="large"
        style="width: 100%; margin-top: 20px"
        :disabled="!selectedType"
        @click="submitRepair"
      >
        提交报修
      </el-button>
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

const selectedType = ref('')
const description = ref('')
const action = ref('wait')

const faultTypes = [
  { id: 'mouse', name: '鼠标故障', icon: 'Mouse' },
  { id: 'keyboard', name: '键盘故障', icon: 'Keyboard' },
  { id: 'headset', name: '耳机故障', icon: 'Headset' },
  { id: 'monitor', name: '显示器', icon: 'Monitor' },
  { id: 'network', name: '网络问题', icon: 'Wifi' },
  { id: 'slow', name: '机器卡顿', icon: 'Loading' },
  { id: 'other', name: '其他问题', icon: 'More' },
]

const submitRepair = async () => {
  if (!selectedType.value) {
    ElMessage.warning('请选择故障类型')
    return
  }

  if (!userStore.currentSession) {
    ElMessage.warning('您当前没有上机')
    return
  }

  try {
    const response = await fetch('/api/faults/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        machineId: userStore.currentSession.machineId,
        faultType: selectedType.value,
        description: description.value,
        playerAction: action.value === 'change' ? 'request_change' : 'wait_repair',
      }),
    })

    if (response.ok) {
      ElMessage.success('报修已提交，网管将尽快处理')
      router.push('/')
    } else {
      ElMessage.error('提交失败')
    }
  } catch (error) {
    ElMessage.error('提交失败')
  }
}
</script>

<style scoped lang="scss">
.repair-container {
  padding: 16px;
  max-width: 768px;
  margin: 0 auto;
}

.nav-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  margin-bottom: 20px;
  
  h3 {
    font-size: 18px;
    color: #fff;
  }
}

.repair-form {
  .section-title {
    font-size: 16px;
    color: #e0e0e0;
    margin-bottom: 12px;
    margin-top: 20px;
    
    &:first-child {
      margin-top: 0;
    }
  }
  
  .fault-types {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 12px;
    
    .fault-item {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 12px;
      padding: 16px 12px;
      text-align: center;
      cursor: pointer;
      transition: all 0.3s;
      border: 2px solid transparent;
      
      .el-icon {
        display: block;
        margin: 0 auto 8px;
        color: #909399;
      }
      
      span {
        font-size: 12px;
        color: #e0e0e0;
      }
      
      &.active {
        border-color: #409eff;
        background: rgba(64, 158, 255, 0.2);
        
        .el-icon {
          color: #409eff;
        }
      }
      
      &:hover {
        background: rgba(255, 255, 255, 0.15);
      }
    }
  }
  
  .action-group {
    width: 100%;
    
    .el-radio-button {
      width: 50%;
    }
  }
}
</style>
