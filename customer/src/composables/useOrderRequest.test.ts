import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { createOrderWorkflow } from './useOrderRequest'
import type { Order, OrderCommand } from '@/api/order'

const firstId = 'a03f9fd2-24e9-4ba7-883c-a3760f9c8b15'
const nextId = 'b03f9fd2-24e9-4ba7-883c-a3760f9c8b15'
const input = { items: [{ itemId: 5, qty: 1 }] }
const receipt = (command: OrderCommand, status = 'pending'): Order => ({
  id: 9, ...command, userId: 7, createdById: 7, createdByType: 'customer',
  items: JSON.stringify(command.items.map(item => ({ ...item, name: '可乐', price: 6 }))),
  total: 6, status, createdAt: '', updatedAt: '', remark: command.remark ?? '',
})

describe('点单请求恢复', () => {
  let values: Map<string, string>
  let storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
  let client: { createOrder: Mock<[OrderCommand], Promise<Order>>; getRequestResult: Mock<[string], Promise<Order>> }
  const workflow = (extra: Record<string, unknown> = {}) => createOrderWorkflow({
    userId: 7, storage, client, newId: () => firstId, ...extra,
  })
  beforeEach(() => {
    values = new Map()
    storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => { values.set(key, value) }, removeItem: key => { values.delete(key) } }
    client = {
      createOrder: vi.fn<[OrderCommand], Promise<Order>>(async command => receipt(command)),
      getRequestResult: vi.fn<[string], Promise<Order>>().mockRejectedValue({ status: 404 }),
    }
  })

  it('先保存编号和商品再发送，确认后清除', async () => {
    client.createOrder.mockImplementation(async command => {
      expect(JSON.parse([...values.values()][0])).toEqual(command)
      return receipt(command)
    })
    const action = workflow()
    expect((await action.submit(input)).id).toBe(9)
    expect(action.pending.value).toBeNull()
    expect(values.size).toBe(0)
  })

  it('双击复用在途请求', async () => {
    let done!: (order: Order) => void
    client.createOrder.mockImplementation(() => new Promise<Order>(resolve => { done = resolve }))
    const action = workflow()
    const first = action.submit(input)
    const second = action.submit(input)
    expect(client.createOrder).toHaveBeenCalledTimes(1)
    expect(action.busy.value).toBe(true)
    done(receipt({ ...input, requestId: firstId }))
    expect(await first).toEqual(await second)
  })

  it('超时后确认原结果，即使已取消也不创建新单', async () => {
    client.createOrder.mockRejectedValue({ status: undefined })
    client.getRequestResult.mockResolvedValue(receipt({ ...input, requestId: firstId }, 'cancelled'))
    const action = workflow()
    expect((await action.submit(input)).status).toBe('cancelled')
    expect(client.createOrder).toHaveBeenCalledTimes(1)
    expect(client.getRequestResult).toHaveBeenCalledWith(firstId)
    expect(action.pending.value).toBeNull()
  })

  it('结果查询404不能当成失败；刷新后复用原编号', async () => {
    client.createOrder.mockRejectedValueOnce(new Error('timeout'))
    await expect(workflow().submit(input)).rejects.toThrow('尚未确认')
    const refreshed = workflow({ newId: () => nextId })
    expect(refreshed.pending.value?.requestId).toBe(firstId)
    await refreshed.submit(input)
    expect(client.createOrder.mock.calls.map(call => call[0].requestId)).toEqual([firstId, firstId])
  })

  it.each([{ items: [{ itemId: 5, qty: 2 }] }, { items: [{ itemId: 4, qty: 1 }] }, { ...input, remark: '新备注' }])
    ('未知结果不允许改参%j', async changed => {
      client.createOrder.mockRejectedValue(new Error('timeout'))
      const action = workflow()
      await expect(action.submit(input)).rejects.toThrow('尚未确认')
      await expect(action.submit(changed)).rejects.toThrow('先确认上次')
      expect(client.createOrder).toHaveBeenCalledTimes(1)
    });

  it.each([400, 404])('提交明确拒绝%d允许修改输入', async status => {
    client.createOrder.mockRejectedValueOnce({ status })
    const action = workflow()
    await expect(action.submit(input)).rejects.toBeTruthy()
    expect(action.pending.value).toBeNull()
    await action.submit({ items: [{ itemId: 5, qty: 2 }] })
  })

  it.each([401, 403, 409, 500])('异常%d保留待确认记录', async status => {
    client.createOrder.mockRejectedValue({ status })
    const action = workflow()
    await expect(action.submit(input)).rejects.toThrow('尚未确认')
    expect(action.pending.value?.requestId).toBe(firstId)
  })

  it('商品顺序不影响重试，新点单才创建新编号', async () => {
    const newId = vi.fn().mockReturnValueOnce(firstId).mockReturnValueOnce(nextId)
    client.createOrder.mockRejectedValueOnce(new Error('timeout'))
    const action = workflow({ newId })
    const items = [{ itemId: 5, qty: 1 }, { itemId: 4, qty: 1 }]
    await expect(action.submit({ items })).rejects.toThrow('尚未确认')
    await action.submit({ items: [...items].reverse() })
    await action.submit(input)
    expect(client.createOrder.mock.calls.map(call => call[0].requestId)).toEqual([firstId, firstId, nextId])
  })

  it('存储写入失败不发送扣款请求', async () => {
    storage.setItem = () => { throw new Error('storage full') }
    await expect(workflow().submit(input)).rejects.toThrow('storage full')
    expect(client.createOrder).not.toHaveBeenCalled()
  })

  it('损坏记录阻止新扣款，不静默删除', async () => {
    values.set('wangba:pending-order:7', 'broken')
    const action = workflow()
    expect(action.storageError.value).toContain('无法读取')
    await expect(action.submit(input)).rejects.toThrow('无法读取')
    expect(client.createOrder).not.toHaveBeenCalled()
  })

  it('顾客账号隔离，换账号后旧结果不清除记录', async () => {
    let current = true
    client.createOrder.mockImplementation(async command => { current = false; return receipt(command) })
    const action = workflow({ isCurrentUser: () => current })
    await expect(action.submit(input)).rejects.toThrow('会员已变更')
    expect(workflow({ userId: 8 }).pending.value).toBeNull()
    expect(workflow().pending.value?.requestId).toBe(firstId)
    expect(client.getRequestResult).not.toHaveBeenCalled()
  })

  it('错误顾客的返回结果不能确认成功', async () => {
    client.createOrder.mockRejectedValue(new Error('timeout'))
    client.getRequestResult.mockResolvedValue({ ...receipt({ ...input, requestId: firstId }), userId: 8 })
    const action = workflow()
    await expect(action.submit(input)).rejects.toThrow('尚未确认')
    expect(action.pending.value?.requestId).toBe(firstId)
  })
})
