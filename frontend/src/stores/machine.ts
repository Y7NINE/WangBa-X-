import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { machineApi, Machine, Area } from '@/api/machine'
import { useAuthStore } from './auth'

export const useMachineStore = defineStore('machine', () => {
  const machines = ref<Machine[]>([])
  const areas = ref<Area[]>([])
  const loading = ref(false)
  const auth = useAuthStore()
  const identity = () => [auth.token, localStorage.getItem('token'), auth.user?.id, auth.user?.role].join(':')
  function requireIdentity() {
    if (auth.token && auth.token !== localStorage.getItem('token')) {
      invalidateRequests(true)
      throw new Error('登录状态已变化，请重新进入当前账号')
    }
  }
  let machineRequest = 0
  let areaRequest = 0
  let machineFlight: Promise<void> | undefined
  let areaFlight: Promise<void> | undefined
  let requestedArea: number | undefined
  let revision = 0
  const patches = new Map<string, { revision: number; status: string }>()

  function invalidateRequests(clear = false) {
    machineRequest++; areaRequest++
    machineFlight = undefined; areaFlight = undefined; loading.value = false
    if (clear) { machines.value = []; areas.value = []; patches.clear(); revision = 0 }
  }
  watch([() => auth.token, () => auth.user?.id, () => auth.user?.role], () => invalidateRequests(true), { flush: 'sync' })
  
  // 统计数据
  const stats = computed(() => {
    const total = machines.value.length
    const online = machines.value.filter(m => m.status === 'online').length
    const offline = machines.value.filter(m => m.status === 'offline').length
    const fault = machines.value.filter(m => m.status === 'fault').length
    const dirty = machines.value.filter(m => m.status === 'dirty').length
    const cleaning = machines.value.filter(m => m.status === 'cleaning').length
    
    return { total, online, offline, fault, dirty, cleaning }
  })
  
  async function fetchMachines(areaId?: number) {
    requireIdentity()
    if (machineFlight && requestedArea === areaId) return machineFlight
    const request = ++machineRequest
    const requestedIdentity = identity()
    const since = revision
    requestedArea = areaId
    loading.value = true
    machineFlight = (async () => {
      try {
        const rows = await machineApi.getMachines({ areaId })
        if (request !== machineRequest || requestedIdentity !== identity()) return
        machines.value = rows.map(row => {
          const patch = patches.get(row.id)
          return patch && patch.revision > since ? { ...row, status: patch.status } : row
        })
        patches.clear()
      } finally {
        if (request === machineRequest) { loading.value = false; machineFlight = undefined; patches.clear() }
      }
    })()
    return machineFlight
  }
  
  async function fetchAreas() {
    requireIdentity()
    if (areaFlight) return areaFlight
    const request = ++areaRequest
    const requestedIdentity = identity()
    areaFlight = (async () => {
      try {
        const rows = await machineApi.getAreas()
        if (request === areaRequest && requestedIdentity === identity()) areas.value = rows
      } finally { if (request === areaRequest) areaFlight = undefined }
    })()
    return areaFlight
  }
  
  function updateMachineStatus(machineId: string, status: string) {
    revision++
    if (machineFlight) patches.set(machineId, { revision, status })
    const machine = machines.value.find(m => m.id === machineId)
    if (machine) {
      machine.status = status
    }
  }
  
  return {
    machines,
    areas,
    loading,
    stats,
    fetchMachines,
    fetchAreas,
    updateMachineStatus,
    invalidateRequests,
  }
})
