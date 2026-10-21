import { defineStore } from 'pinia'
import { ref, shallowRef, watch } from 'vue'
import { io, type Socket } from 'socket.io-client'
import { useMachineStore } from './machine'
import { useFaultStore } from './fault'
import { useAuthStore } from './auth'
import { ElNotification } from 'element-plus'
import { canAccessPage } from '@/access'

export const useSocketStore = defineStore('socket', () => {
  const socket = shallowRef<Socket | null>(null)
  const connected = ref(false)
  const recovering = ref(false)
  const recoveryError = ref('')
  const auth = useAuthStore()
  let recoveryVersion = 0
  function invalidateRecovery() {
    recoveryVersion++
    recovering.value = false
    recoveryError.value = ''
    useMachineStore().invalidateRequests()
    useFaultStore().invalidateRequests()
  }
  async function recover() {
    const client = socket.value
    if (!client || !connected.value) return
    const request = ++recoveryVersion
    const token = auth.token
    const role = auth.user?.role
    const id = auth.user?.id
    recovering.value = true
    recoveryError.value = ''
    const current = () => socket.value === client && connected.value && request === recoveryVersion &&
      auth.token === token && auth.user?.role === role && auth.user?.id === id
    const sessionChanged = () => {
      if (localStorage.getItem('token') === token) return false
      recovering.value = false
      recoveryError.value = '登录状态已变化，请重新进入当前账号'
      return true
    }
    try {
      const mayReadFaults = canAccessPage(role, '/faults')
      if (mayReadFaults) {
        await new Promise<void>((resolve, reject) => {
          client.timeout(5000).emit('subscribe', { topic: 'tickets' }, (error: Error | null, reply: { ok?: boolean } | undefined) => {
            if (error || !reply?.ok) reject(error || new Error('工单订阅未确认'))
            else resolve()
          })
        })
      }
      if (!current()) return
      if (sessionChanged()) return
      const machine = useMachineStore()
      const faults = useFaultStore()
      const tasks = [machine.fetchAreas(), machine.fetchMachines()]
      if (mayReadFaults) tasks.push(faults.fetchTickets())
      else faults.invalidateRequests(true)
      const results = await Promise.allSettled(tasks)
      if (!current()) return
      if (sessionChanged()) return
      recovering.value = false
      if (results.some(result => result.status === 'rejected')) recoveryError.value = '部分数据未更新，请重新同步'
    } catch {
      if (current()) { recovering.value = false; recoveryError.value = '订阅未确认，请重新同步' }
    }
  }
  function disconnect() {
    invalidateRecovery()
    const previous = socket.value
    socket.value = null
    connected.value = false
    previous?.removeAllListeners()
    previous?.disconnect()
  }
  function connect() {
    disconnect()
    if (!auth.token || !localStorage.getItem('token')) return
    const client = io({ path: '/socket.io', auth: callback => callback({ token: localStorage.getItem('token') }) })
    socket.value = client
    const current = () => socket.value === client
    client.on('connect', () => {
      if (!current()) return
      connected.value = true
      void recover()
    })
    client.on('disconnect', () => { if (current()) { connected.value = false; invalidateRecovery() } })
    client.on('connect_error', () => { if (current()) { connected.value = false; invalidateRecovery() } })
    client.on('machine_status_update', (data: { machine_id: string; status: string }) => {
      if (current()) useMachineStore().updateMachineStatus(data.machine_id, data.status)
    })
    client.on('new_alert', (data: any) => {
      if (!current()) return
      useFaultStore().addTicket(data)
      ElNotification({ title: `新故障告警 - ${data.priority}`, message: `${data.machineId}: ${data.faultType}`, type: 'warning', duration: 0 })
    })
    client.on('ticket_update', (data: { id: string; updates: any }) => {
      if (current()) useFaultStore().updateTicket(data.id, data.updates)
    })
  }
  watch(() => auth.token, () => { if (socket.value) connect() }, { flush: 'sync' })
  function emit(event: string, data?: any) { socket.value?.emit(event, data) }
  return { socket, connected, recovering, recoveryError, recover, connect, disconnect, emit }
})
