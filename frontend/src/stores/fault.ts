import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { faultApi, FaultTicket } from '@/api/fault'

export const useFaultStore = defineStore('fault', () => {
  const tickets = ref<FaultTicket[]>([])
  const loading = ref(false)
  
  // 待处理工单
  const pendingTickets = computed(() => 
    tickets.value.filter(t => t.status === 'pending')
  )
  
  // 处理中工单
  const processingTickets = computed(() => 
    tickets.value.filter(t => ['accepted', 'processing'].includes(t.status))
  )
  
  // 按优先级排序
  const sortedTickets = computed(() => {
    const priorityOrder = { P0: 0, P1: 1, P2: 2, P3: 3 }
    return [...tickets.value].sort((a, b) => {
      const pa = priorityOrder[a.priority as keyof typeof priorityOrder] || 4
      const pb = priorityOrder[b.priority as keyof typeof priorityOrder] || 4
      return pa - pb
    })
  })
  
  async function fetchTickets() {
    loading.value = true
    try {
      tickets.value = await faultApi.getTickets()
    } finally {
      loading.value = false
    }
  }
  
  function addTicket(ticket: FaultTicket) {
    tickets.value.unshift(ticket)
  }
  
  function updateTicket(id: string, updates: Partial<FaultTicket>) {
    const index = tickets.value.findIndex(t => t.id === id)
    if (index !== -1) {
      tickets.value[index] = { ...tickets.value[index], ...updates }
    }
  }
  
  function removeTicket(id: string) {
    tickets.value = tickets.value.filter(t => t.id !== id)
  }
  
  return {
    tickets,
    loading,
    pendingTickets,
    processingTickets,
    sortedTickets,
    fetchTickets,
    addTicket,
    updateTicket,
    removeTicket,
  }
})
