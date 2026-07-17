<template>
  <div class="menu-container">
    <div class="nav-bar">
      <el-button text @click="$router.push('/')">
        <el-icon><ArrowLeft /></el-icon> 返回
      </el-button>
      <h3>水吧点单</h3>
      <div></div>
    </div>

    <div class="menu-list">
      <div v-for="item in menuItems" :key="item.id" class="menu-item">
        <div class="item-image">
          <el-icon :size="40"><Coffee /></el-icon>
        </div>
        <div class="item-info">
          <div class="item-name">{{ item.name }}</div>
          <div class="item-desc">{{ item.description }}</div>
          <div class="item-price">¥{{ item.price }}</div>
        </div>
        <el-button type="primary" size="small" @click="addToCart(item)">
          加入购物车
        </el-button>
      </div>
    </div>

    <!-- 购物车 -->
    <div v-if="cart.length > 0" class="cart-bar">
      <div class="cart-info">
        <el-badge :value="cartCount">
          <el-icon :size="24"><ShoppingCart /></el-icon>
        </el-badge>
        <span class="cart-total">¥{{ cartTotal }}</span>
      </div>
      <el-button type="primary" @click="submitOrder">提交订单</el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const menuItems = [
  { id: 1, name: '冰美式', description: '经典冰咖啡', price: 18, category: 'coffee' },
  { id: 2, name: '拿铁', description: '香浓拿铁', price: 22, category: 'coffee' },
  { id: 3, name: '西瓜汁', description: '鲜榨西瓜汁', price: 15, category: 'juice' },
  { id: 4, name: '柠檬茶', description: '冰镇柠檬茶', price: 12, category: 'tea' },
  { id: 5, name: '可乐', description: '冰镇可乐', price: 6, category: 'drink' },
  { id: 6, name: '雪碧', description: '冰镇雪碧', price: 6, category: 'drink' },
  { id: 7, name: '薯条', description: '香脆薯条', price: 16, category: 'snack' },
  { id: 8, name: '鸡米花', description: '香辣鸡米花', price: 20, category: 'snack' },
]

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
}

const cart = ref<CartItem[]>([])

const cartCount = computed(() => cart.value.reduce((sum, item) => sum + item.quantity, 0))
const cartTotal = computed(() => cart.value.reduce((sum, item) => sum + item.price * item.quantity, 0))

const addToCart = (item: any) => {
  const existing = cart.value.find(c => c.id === item.id)
  if (existing) {
    existing.quantity++
  } else {
    cart.value.push({ ...item, quantity: 1 })
  }
  ElMessage.success(`已添加 ${item.name}`)
}

const submitOrder = async () => {
  if (!userStore.isLoggedIn) {
    ElMessage.warning('请先登录')
    return
  }

  ElMessage.success('订单已提交，稍后送到您的座位')
  cart.value = []
}
</script>

<style scoped lang="scss">
.menu-container {
  padding: 16px;
  max-width: 768px;
  margin: 0 auto;
  padding-bottom: 80px;
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

.menu-list {
  .menu-item {
    display: flex;
    align-items: center;
    gap: 16px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 12px;
    
    .item-image {
      width: 60px;
      height: 60px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #e6a23c;
    }
    
    .item-info {
      flex: 1;
      
      .item-name {
        font-size: 16px;
        font-weight: bold;
        margin-bottom: 4px;
      }
      
      .item-desc {
        font-size: 12px;
        color: #909399;
        margin-bottom: 4px;
      }
      
      .item-price {
        font-size: 16px;
        color: #e6a23c;
        font-weight: bold;
      }
    }
  }
}

.cart-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #1e3a5f;
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.3);
  
  .cart-info {
    display: flex;
    align-items: center;
    gap: 16px;
    
    .cart-total {
      font-size: 20px;
      font-weight: bold;
      color: #e6a23c;
    }
  }
}
</style>
