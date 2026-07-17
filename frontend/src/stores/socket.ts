import { defineStore } from 'pinia'
import { ref } from 'vue'
import { io, Socket } from 'socket.io-client'
import { useMachineStore } from './machine'
import { useFaultStore } from './fault'
import { ElNotification } from 'element-plus'

export const useSocketStore = defineStore('socket', () => {
  const socket = ref<Socket | null>(null)
  const connected = ref(false)
  
  function connect() {
    socket.value = io('http://localhost:3000', {
      auth: {
        token: localStorage.getItem('token'),
      },
    })
    
    socket.value.on('connect', () => {
      connected.value = true
      console.log('WebSocket连接成功')
    })
    
    socket.value.on('disconnect', () => {
      connected.value = false
      console.log('WebSocket断开')
    })
    
    // 机器状态更新
    socket.value.on('machine_status_update', (data: { machine_id: string; status: string }) => {
      const machineStore = useMachineStore()
      machineStore.updateMachineStatus(data.machine_id, data.status)
    })
    
    // 新故障告警
    socket.value.on('new_alert', (data: any) => {
      const faultStore = useFaultStore()
      faultStore.addTicket(data)
      
      ElNotification({
        title: `新故障告警 - ${data.priority}`,
        message: `${data.machineId}: ${data.faultType}`,
        type: 'warning',
        duration: 0,
      })
    })
    
    // 故障工单更新
    socket.value.on('ticket_update', (data: { id: string; updates: any }) => {
      const faultStore = useFaultStore()
      faultStore.updateTicket(data.id, data.updates)
    })
    
    // 心跳响应
    socket.value.on('heartbeat_ack', (data: any) => {
      // 处理心跳响应
    })
  }
  
  function disconnect() {
    socket.value?.disconnect()
    socket.value = null
    connected.value = false
  }
  
  function emit(event: string, data?: any) {
    socket.value?.emit(event, data)
  }
  
  return {
    socket,
    connected,
    connect,
    disconnect,
    emit,
  }
})
