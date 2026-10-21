import { computed, readonly, ref, shallowRef, watch } from 'vue'
import { orderApi, type Order, type OrderCommand } from '@/api/order'
import { useUserStore } from '@/stores/user'

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
function canonical(input: Omit<OrderCommand, 'requestId'>) {
  if (!Array.isArray(input.items) || input.items.length < 1 || input.items.length > 30 ||
    input.items.some(item => !item || !Number.isSafeInteger(item.itemId) || item.itemId < 1 ||
      !Number.isInteger(item.qty) || item.qty < 1 || item.qty > 20) ||
    new Set(input.items.map(item => item.itemId)).size !== input.items.length ||
    (input.remark !== undefined && (typeof input.remark !== 'string' || input.remark.length > 255))) {
    throw new Error('请检查商品数量和备注')
  }
  return { items: input.items.map(item => ({ itemId: item.itemId, qty: item.qty })).sort((a, b) => a.itemId - b.itemId), remark: input.remark ?? '' }
}

export function createOrderWorkflow(options: {
  userId: number
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  client: Pick<typeof orderApi, 'createOrder' | 'getRequestResult'>
  newId: () => string
  isCurrentUser?: () => boolean
}) {
  const key = `wangba:pending-order:${options.userId}`
  const pending = ref<OrderCommand | null>(null)
  const busy = ref(false)
  const storageError = ref('')
  let flight: Promise<Order> | undefined
  function restore() {
    try {
      const raw = options.storage.getItem(key)
      const value = raw ? JSON.parse(raw) : null
      if (value && (!uuid.test(value.requestId) || !canonical(value))) throw new Error('invalid record')
      pending.value = value
      storageError.value = ''
    } catch { storageError.value = '原点单记录无法读取，请先核对订单，勿重新付款' }
  }
  restore()
  function assertUser() {
    if (!Number.isSafeInteger(options.userId) || options.userId < 1 || options.isCurrentUser?.() === false) {
      throw new Error('登录会员已变更，请重新进入点单页面确认')
    }
  }
  function confirm(command: OrderCommand, order: Order) {
    assertUser()
    let sameItems = false
    try { sameItems = JSON.stringify(canonical({ items: JSON.parse(order.items), remark: order.remark })) === JSON.stringify(canonical(command)) } catch {}
    if (order.requestId !== command.requestId || order.userId !== options.userId || order.createdByType !== 'customer' ||
      order.createdById !== options.userId || !sameItems) throw new Error('订单结果不匹配，请核对订单')
    options.storage.removeItem(key)
    pending.value = null
    return order
  }
  function submit(input: Omit<OrderCommand, 'requestId'>): Promise<Order> {
    try {
      assertUser()
      restore()
      if (storageError.value) throw new Error(storageError.value)
      const normalized = canonical(input)
      if (pending.value && JSON.stringify(canonical(pending.value)) !== JSON.stringify(normalized)) {
        throw new Error('请先确认上次点单结果，再修改商品或重新下单')
      }
      if (flight) return flight
      const command = pending.value || { ...normalized, requestId: options.newId() }
      if (!uuid.test(command.requestId)) throw new Error('无法生成有效点单编号')
      options.storage.setItem(key, JSON.stringify(command))
      pending.value = JSON.parse(JSON.stringify(command))
      busy.value = true
      flight = (async () => {
        try {
          return confirm(command, await options.client.createOrder(JSON.parse(JSON.stringify(command))))
        } catch (error: any) {
          assertUser()
          if ([400, 404].includes(error.status ?? error.response?.status)) {
            options.storage.removeItem(key)
            pending.value = null
            throw error
          }
          try { return confirm(command, await options.client.getRequestResult(command.requestId)) }
          catch { throw new Error('点单结果尚未确认，请确认原订单，勿重复付款') }
        } finally { busy.value = false; flight = undefined }
      })()
      return flight
    } catch (error) { return Promise.reject(error) }
  }
  return { pending: readonly(pending), busy: readonly(busy), storageError: readonly(storageError), submit }
}

export function useOrderRequest() {
  const user = useUserStore()
  const build = (userId: number) => createOrderWorkflow({
      userId, storage: sessionStorage, client: orderApi, newId: () => crypto.randomUUID(),
      isCurrentUser: () => user.user?.id === userId,
  })
  // Profile refresh replaces the user object; keep this workflow while its ID is unchanged.
  const workflow = shallowRef(build(user.user?.id || 0))
  watch(() => user.user?.id || 0, id => { workflow.value = build(id) }, { flush: 'sync' })
  return {
    pending: computed(() => workflow.value.pending.value),
    busy: computed(() => workflow.value.busy.value),
    storageError: computed(() => workflow.value.storageError.value),
    submit: (input: Omit<OrderCommand, 'requestId'>) => workflow.value.submit(input),
  }
}
