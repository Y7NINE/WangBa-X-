import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { machineApi, Machine, Area } from '@/api/machine'

export const useMachineStore = defineStore('machine', () => {
  const machines = ref<Machine[]>([])
  const areas = ref<Area[]>([])
  const loading = ref(false)
  
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
    loading.value = true
    try {
      machines.value = await machineApi.getMachines({ areaId })
    } finally {
      loading.value = false
    }
  }
  
  async function fetchAreas() {
    areas.value = await machineApi.getAreas()
  }
  
  function updateMachineStatus(machineId: string, status: string) {
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
  }
})
