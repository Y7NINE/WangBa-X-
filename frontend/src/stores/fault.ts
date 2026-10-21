import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { faultApi, FaultTicket } from '@/api/fault'
import { useAuthStore } from './auth'

export const useFaultStore = defineStore('fault', () => {
  const tickets = ref<FaultTicket[]>([])
  const loading = ref(false)
  const auth = useAuthStore()
  const identity = () => [auth.token, localStorage.getItem('token'), auth.user?.id, auth.user?.role].join(':')
  let requestVersion = 0
  let flight: Promise<void> | undefined
  let revision = 0
  type Patch = { revision: number; kind: 'add' | 'update' | 'remove'; id: string; data?: Partial<FaultTicket> }
  let patches: Patch[] = []
  function invalidateRequests(clear = false) {
    requestVersion++; flight = undefined; loading.value = false
    if (clear) { tickets.value = []; patches = []; revision = 0 }
  }
  watch([() => auth.token, () => auth.user?.id, () => auth.user?.role], () => invalidateRequests(true), { flush: 'sync' })
  function apply(rows: FaultTicket[], patch: Patch) {
    if (patch.kind === 'remove') return rows.filter(row => row.id !== patch.id)
    const index = rows.findIndex(row => row.id === patch.id)
    if (index !== -1) rows[index] = { ...rows[index], ...patch.data }
    else if (patch.kind === 'add') rows.unshift(patch.data as FaultTicket)
    return rows
  }
  
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
      const pa = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4
      const pb = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4
      return pa - pb
    })
  })
  
  async function fetchTickets() {
    if (auth.token && auth.token !== localStorage.getItem('token')) {
      invalidateRequests(true)
      throw new Error('登录状态已变化，请重新进入当前账号')
    }
    if (flight) return flight
    const request = ++requestVersion
    const requestedIdentity = identity()
    const since = revision
    loading.value = true
    flight = (async () => {
      try {
        const rows = await faultApi.getTickets()
        if (request !== requestVersion || requestedIdentity !== identity()) return
        tickets.value = patches.filter(patch => patch.revision > since).reduce(apply, [...rows])
        patches = []
      } finally { if (request === requestVersion) { loading.value = false; flight = undefined; patches = [] } }
    })()
    return flight
  }
  
  function addTicket(ticket: FaultTicket) {
    const patch: Patch = { revision: ++revision, kind: 'add', id: ticket.id, data: { ...ticket } }
    if (flight) patches.push(patch)
    tickets.value = apply(tickets.value, patch)
  }
  
  function updateTicket(id: string, updates: Partial<FaultTicket>) {
    const patch: Patch = { revision: ++revision, kind: 'update', id, data: { ...updates } }
    if (flight) patches.push(patch)
    tickets.value = apply(tickets.value, patch)
  }
  
  function removeTicket(id: string) {
    const patch: Patch = { revision: ++revision, kind: 'remove', id }
    if (flight) patches.push(patch)
    tickets.value = apply(tickets.value, patch)
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
    invalidateRequests,
  }
})
