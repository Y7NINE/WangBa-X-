import { readonly, ref } from 'vue'
import { billingApi, type RechargeCommand, type Transaction } from '@/api/billing'
import { useAuthStore } from '@/stores/auth'

type RechargeInput = Omit<RechargeCommand, 'requestId'>
interface RechargeClient {
  recharge(command: RechargeCommand): Promise<Transaction>
  getRechargeResult(requestId: string): Promise<Transaction>
}
const valid = (command: RechargeCommand) => command &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(command.requestId) &&
  Number.isSafeInteger(command.userId) && command.userId > 0 &&
  Number.isFinite(command.amount) && command.amount >= 0.01 && command.amount <= 10000 &&
  Math.abs(command.amount * 100 - Math.round(command.amount * 100)) < 0.000001 &&
  ['cash', 'wechat', 'alipay', 'demo'].includes(command.paymentMethod)
const same = (a: RechargeInput, b: RechargeInput) =>
  a.userId === b.userId && a.amount === b.amount && a.paymentMethod === b.paymentMethod

/** One unresolved recharge per operator per tab; survives route changes and refresh. */
export function createRechargeWorkflow(options: {
  operatorId: number
  storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  client: RechargeClient
  newId: () => string
  isCurrentOperator?: () => boolean
}) {
  const key = `wangba:pending-recharge:${options.operatorId}`
  const pending = ref<RechargeCommand | null>(null)
  const busy = ref(false)
  const storageError = ref('')
  let flight: Promise<Transaction> | undefined
  function restore() {
    try {
      const raw = options.storage.getItem(key)
      const value = raw ? JSON.parse(raw) : null
      if (value && !valid(value)) throw new Error('invalid pending recharge')
      pending.value = value
      storageError.value = ''
    } catch {
      storageError.value = '待确认充值记录无法读取，请先核对流水后处理浏览器存储'
    }
  }
  restore()
  const assertActor = () => {
    if (!Number.isSafeInteger(options.operatorId) || options.operatorId < 1 || options.isCurrentOperator?.() === false) {
      throw new Error('登录员工已变更，请返回当前账号重新确认充值')
    }
  }
  function confirm(command: RechargeCommand, receipt: Transaction) {
    assertActor()
    if (receipt.requestId !== command.requestId || receipt.operatorId !== options.operatorId ||
      receipt.type !== 'recharge' || receipt.userId !== command.userId ||
      Number(receipt.amount) !== command.amount || receipt.paymentMethod !== command.paymentMethod) {
      throw new Error('充值结果不匹配，请核对流水')
    }
    options.storage.removeItem(key)
    pending.value = null
    return receipt
  }
  function submit(input: RechargeInput): Promise<Transaction> {
    try {
      assertActor()
      restore()
      if (storageError.value) throw new Error(storageError.value)
      if (pending.value && !same(pending.value, input)) {
        throw new Error(`请先确认会员 ${pending.value.userId} 的原充值结果，再发起新充值`)
      }
      if (flight) return flight
      const command = pending.value || { ...input, requestId: options.newId() }
      if (!valid(command)) throw new Error('请填写有效会员ID、金额和支付方式')
      // Persist before sending; storage failure must not send a financial request.
      options.storage.setItem(key, JSON.stringify(command))
      pending.value = { ...command }
      busy.value = true
      flight = (async () => {
        try {
          return confirm(command, await options.client.recharge({ ...command }))
        } catch (error: any) {
          assertActor()
          if ([400, 404].includes(error.response?.status)) {
            options.storage.removeItem(key)
            pending.value = null
            throw error
          }
          try {
            return confirm(command, await options.client.getRechargeResult(command.requestId))
          } catch {
            throw new Error('充值结果尚未确认，请保留原充值并重试，勿重复收款')
          }
        } finally {
          busy.value = false
          flight = undefined
        }
      })()
      return flight
    } catch (error) {
      return Promise.reject(error)
    }
  }
  return { pending: readonly(pending), busy: readonly(busy), storageError: readonly(storageError), restore, submit }
}

export function useRecharge() {
  const auth = useAuthStore()
  const operatorId = auth.user?.id || 0
  return createRechargeWorkflow({
    operatorId, storage: sessionStorage, client: billingApi,
    newId: () => crypto.randomUUID(),
    isCurrentOperator: () => auth.user?.id === operatorId,
  })
}
