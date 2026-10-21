import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest'
import { createRechargeWorkflow } from '@/composables/useRecharge'
import type { RechargeCommand, Transaction } from '@/api/billing'

const firstId = 'a03f9fd2-24e9-4ba7-883c-a3760f9c8b15'
const nextId = 'b03f9fd2-24e9-4ba7-883c-a3760f9c8b15'
const input = { userId: 7, amount: 12.34, paymentMethod: 'cash' }
const receipt = (command: RechargeCommand): Transaction => ({
  ...command, id: 9, operatorId: 3, type: 'recharge', balanceAfter: 42.34, createdAt: '2026-10-21',
})
const failure = (status?: number) => ({ response: status ? { status } : undefined })

describe('充值请求重试与结果确认', () => {
  let values: Map<string, string>
  let storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  let client: { recharge: Mock<[RechargeCommand], Promise<Transaction>>; getRechargeResult: Mock<[string], Promise<Transaction>> }
  const workflow = (extra: Record<string, unknown> = {}) => createRechargeWorkflow({
    operatorId: 3, storage, client, newId: () => firstId, ...extra,
  })
  beforeEach(() => {
    values = new Map()
    storage = {
      getItem: key => values.get(key) ?? null,
      setItem: (key, value) => { values.set(key, value) },
      removeItem: key => { values.delete(key) },
    }
    client = {
      recharge: vi.fn<[RechargeCommand], Promise<Transaction>>(async command => receipt(command)),
      getRechargeResult: vi.fn<[string], Promise<Transaction>>().mockRejectedValue(failure(404)),
    }
  })

  it('发送前持久化请求编号，成功清除记录并返回服务端余额', async () => {
    client.recharge.mockImplementation(async (command: RechargeCommand) => {
      expect([...values.values()].map(value => JSON.parse(value))).toEqual([command])
      return receipt(command)
    })
    const action = workflow()
    const result = await action.submit(input)
    expect(result.balanceAfter).toBe(42.34)
    expect(values.size).toBe(0)
    expect(action.pending.value).toBeNull()
    expect(action.busy.value).toBe(false)
  })

  it('双击共用在途请求，防止两个页面入口重复发起', async () => {
    let resolve!: (result: Transaction) => void
    client.recharge.mockImplementation(() => new Promise<Transaction>(done => { resolve = done }))
    const action = workflow()
    const first = action.submit(input)
    const second = action.submit(input)
    expect(client.recharge).toHaveBeenCalledTimes(1)
    expect(action.busy.value).toBe(true)
    resolve(receipt({ ...input, requestId: firstId }))
    expect(await second).toEqual(await first)
  })

  it('超时但已入账时按原编号确认，不再发起第二次充值', async () => {
    client.recharge.mockRejectedValue(failure())
    client.getRechargeResult.mockResolvedValue(receipt({ ...input, requestId: firstId }))
    const action = workflow()
    expect((await action.submit(input)).id).toBe(9)
    expect(client.getRechargeResult).toHaveBeenCalledWith(firstId)
    expect(client.recharge).toHaveBeenCalledTimes(1)
    expect(action.pending.value).toBeNull()
  })

  it('查询404仍保留未知结果，刷新后重试复用原编号', async () => {
    client.recharge.mockRejectedValueOnce(failure())
    const first = workflow()
    await expect(first.submit(input)).rejects.toThrow('尚未确认')
    expect(first.pending.value?.requestId).toBe(firstId)
    const refreshed = workflow({ newId: () => nextId })
    expect(refreshed.pending.value?.requestId).toBe(firstId)
    await refreshed.submit(input)
    expect(client.recharge.mock.calls.map(call => call[0].requestId)).toEqual([firstId, firstId])
    expect(values.size).toBe(0)
  })

  it.each([{ userId: 8 }, { amount: 20 }, { paymentMethod: 'wechat' }])('未知结果时不允许修改参数 %j', async change => {
    client.recharge.mockRejectedValue(failure(500))
    const action = workflow()
    await expect(action.submit(input)).rejects.toThrow('尚未确认')
    await expect(action.submit({ ...input, ...change })).rejects.toThrow('先确认会员')
    expect(client.recharge).toHaveBeenCalledTimes(1)
  })

  it.each([400, 404])('提交收到明确拒绝%d后允许更正输入', async status => {
    client.recharge.mockRejectedValueOnce(failure(status))
    const action = workflow()
    await expect(action.submit(input)).rejects.toBeTruthy()
    expect(action.pending.value).toBeNull()
    expect(values.size).toBe(0)
    expect(client.getRechargeResult).not.toHaveBeenCalled()
    await action.submit({ ...input, amount: 20 })
  })

  it.each([403, 409, 500])('提交异常%d时保留原请求', async status => {
    client.recharge.mockRejectedValue(failure(status))
    const action = workflow()
    await expect(action.submit(input)).rejects.toThrow('尚未确认')
    expect(action.pending.value?.requestId).toBe(firstId)
  })

  it('成功后新充值生成新编号', async () => {
    const newId = vi.fn().mockReturnValueOnce(firstId).mockReturnValueOnce(nextId)
    const action = workflow({ newId })
    await action.submit(input)
    await action.submit(input)
    expect(client.recharge.mock.calls.map(call => call[0].requestId)).toEqual([firstId, nextId])
  })

  it('存储写入失败不发送充值请求', async () => {
    storage.setItem = () => { throw new Error('storage full') }
    await expect(workflow().submit(input)).rejects.toThrow('storage full')
    expect(client.recharge).not.toHaveBeenCalled()
  })

  it('损坏的待确认记录阻止新充值，不静默丢失原编号', async () => {
    values.set('wangba:pending-recharge:3', 'broken JSON')
    const action = workflow()
    expect(action.storageError.value).toContain('无法读取')
    await expect(action.submit(input)).rejects.toThrow('无法读取')
    expect(client.recharge).not.toHaveBeenCalled()
    expect(values.size).toBe(1)
  })

  it('不同员工隔离待确认记录', async () => {
    client.recharge.mockRejectedValue(failure())
    await expect(workflow().submit(input)).rejects.toThrow()
    expect(workflow({ operatorId: 2 }).pending.value).toBeNull()
    expect(workflow().pending.value?.userId).toBe(input.userId)
  })

  it('账号切换后的旧响应不能清除待确认记录', async () => {
    let current = true
    client.recharge.mockImplementation(async (command: RechargeCommand) => {
      current = false
      return receipt(command)
    })
    const action = workflow({ isCurrentOperator: () => current })
    await expect(action.submit(input)).rejects.toThrow('员工已变更')
    expect(action.pending.value?.requestId).toBe(firstId)
    expect(client.getRechargeResult).not.toHaveBeenCalled()
  })

  it('查询返回其他充值时不能误认成功', async () => {
    client.recharge.mockRejectedValue(failure())
    client.getRechargeResult.mockResolvedValue(receipt({ ...input, requestId: nextId }))
    const action = workflow()
    await expect(action.submit(input)).rejects.toThrow('尚未确认')
    expect(action.pending.value?.requestId).toBe(firstId)
  })
})
