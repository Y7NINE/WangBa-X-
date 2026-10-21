import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
const base = process.env.LOCAL_API || 'http://127.0.0.1:3000';
const checks = [];
async function call(path, { method = 'GET', token, body, status = 200 } = {}) {
  const response = await fetch(base + path, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(10000) });
  const data = await response.json();
  assert.equal(response.status, status, `${method} ${path}: ${JSON.stringify(data)}`);
  return data;
}
async function check(name, work) { await work(); checks.push(name); console.log(`✓ ${name}`); }
try {
  const health = await call('/health');
  assert.equal(health.mode, 'demo', '仅允许对本地仿真服务执行会改变数据的检查');
  const { token: admin } = await call('/auth/login', { method: 'POST', body: { username: 'admin', password: 'admin123' }, status: 201 });
  const suffix = String(Date.now()).slice(-7);
  let a = await call('/auth/customer/login', { method: 'POST', body: { phone: `1389${suffix}`, code: '123456' }, status: 201 });
  let b = await call('/auth/customer/login', { method: 'POST', body: { phone: `1399${suffix}`, code: '123456' }, status: 201 });
  const profile = token => call('/auth/customer/profile', { token });
  const recharge = (id, amount) => call('/billing/recharge', { method: 'POST', token: admin, body: { requestId: randomUUID(), userId: id, amount, paymentMethod: 'demo' }, status: 201 });
  const seats = (await call('/machines')).filter(machine => machine.status === 'offline');
  assert.ok(seats.length >= 2, '至少需要2个空闲座位');
  await check('错误验证码与非法手机号被拒绝', async () => {
    await call('/auth/customer/login', { method: 'POST', body: { phone: a.user.phone, code: '000000' }, status: 401 });
    await call('/auth/customer/login', { method: 'POST', body: { phone: 'abc', code: '123456' }, status: 400 });
  });
  await check('余额不足无法上机，负数充值被拒绝', async () => {
    await call('/billing/sessions', { method: 'POST', token: a.token, body: { userId: a.user.id, machineId: seats[0].id }, status: 400 });
    await call('/billing/recharge', { method: 'POST', token: admin, body: { requestId: randomUUID(), userId: a.user.id, amount: -1, paymentMethod: 'demo' }, status: 400 });
    await recharge(a.user.id, 100); await recharge(b.user.id, 100);
  });
  await check('顾客不能充值、读取用户表或更改机器状态', async () => {
    await call('/users', { token: a.token, status: 403 });
    await call('/billing/recharge', { method: 'POST', token: a.token, body: { userId: a.user.id, amount: 100, paymentMethod: 'demo' }, status: 403 });
    await call(`/machines/${seats[0].id}/status`, { method: 'PATCH', token: a.token, body: { status: 'offline' }, status: 403 });
  });
  let session;
  await check('两个顾客并发抢同一座位仅一个成功', async () => {
    const responses = await Promise.all([a, b].map(user => fetch(base + '/billing/sessions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` }, body: JSON.stringify({ userId: user.user.id, machineId: seats[0].id }) })));
    assert.deepEqual(responses.map(r => r.status).sort(), [201, 400]);
    const winner = responses[0].status === 201 ? a : b;
    const loser = winner === a ? b : a;
    if (winner !== a) [a, b] = [b, a];
    session = await responses[0].json();
    if (!session.id) session = await responses[1].json();
  });
  // Derive identities from the actual session: request ordering is not ownership.
  const actualA = await profile(a.token);
  if (actualA.id !== session.userId) throw new Error('并发测试用户映射不正确');
  await check('活跃会话按顾客隔离，不能结算他人会话', async () => {
    assert.equal((await call('/billing/sessions', { token: b.token })).length, 0);
    await call(`/billing/sessions/${session.id}/end`, { method: 'PATCH', token: b.token, status: 403 });
    await call('/billing/sessions', { method: 'POST', token: b.token, body: { userId: a.user.id, machineId: seats[1].id }, status: 403 });
  });
  await check('暂停冻结费用，暂停中不能再次上机', async () => {
    await call(`/billing/sessions/${session.id}/pause`, { method: 'PATCH', token: a.token });
    const before = (await call('/billing/sessions', { token: a.token }))[0];
    await new Promise(done => setTimeout(done, 1100));
    const after = (await call('/billing/sessions', { token: a.token }))[0];
    assert.equal(after.amount, before.amount); assert.equal(after.duration, before.duration);
    await call('/billing/sessions', { method: 'POST', token: a.token, body: { userId: a.user.id, machineId: seats[1].id }, status: 400 });
    await call(`/billing/sessions/${session.id}/resume`, { method: 'PATCH', token: a.token });
  });
  let order;
  await check('服务端商品定价，订单扣款与退款各只发生一次', async () => {
    const before = Number((await profile(a.token)).balance);
    await call('/orders', { method: 'POST', token: a.token, body: { requestId: randomUUID(), items: [{ itemId: 5, qty: 1 }], total: 0.01 }, status: 400 });
    order = await call('/orders', { method: 'POST', token: a.token, body: { requestId: randomUUID(), userId: b.user.id, items: [{ itemId: 5, qty: 1 }] }, status: 201 });
    assert.equal(order.userId, a.user.id); assert.equal(Number(order.total), 6);
    assert.equal(Number((await profile(a.token)).balance), before - 6);
    assert.equal((await call('/orders', { token: b.token })).length, 0);
    await call(`/orders/${order.id}/status`, { method: 'PATCH', token: a.token, body: { status: 'completed' }, status: 403 });
    await call(`/orders/${order.id}/status`, { method: 'PATCH', token: admin, body: { status: 'completed' }, status: 400 });
    await Promise.all([1, 2].map(() => call(`/orders/${order.id}/status`, { method: 'PATCH', token: admin, body: { status: 'cancelled' } })));
    assert.equal(Number((await profile(a.token)).balance), before);
    await call('/orders', { method: 'POST', token: a.token, body: { requestId: randomUUID(), items: 'invalid' }, status: 400 });
    await call('/orders', { method: 'POST', token: a.token, body: { requestId: randomUUID(), items: [{ itemId: 5, qty: -1 }] }, status: 400 });
  });
  await check('点单正常履约：待接单→制作→配送→完成', async () => {
    const row = await call('/orders', { method: 'POST', token: a.token, body: { requestId: randomUUID(), items: [{ itemId: 4, qty: 1 }] }, status: 201 });
    for (const status of ['preparing', 'delivering', 'completed']) await call(`/orders/${row.id}/status`, { method: 'PATCH', token: admin, body: { status } });
  });
  let ticket;
  await check('报修绑定本人座位，重复报修与他人操作被拒绝', async () => {
    await call('/faults/tickets', { method: 'POST', token: b.token, body: { machineId: session.machineId, faultType: 'mouse' }, status: 403 });
    ticket = await call('/faults/tickets', { method: 'POST', token: a.token, body: { machineId: session.machineId, faultType: 'mouse', description: '本地回归测试' }, status: 201 });
    await call('/faults/tickets', { method: 'POST', token: a.token, body: { machineId: session.machineId, faultType: 'mouse' }, status: 400 });
    await call(`/faults/tickets/${ticket.id}`, { token: b.token, status: 403 });
    await call(`/faults/tickets/${ticket.id}/accept`, { method: 'PATCH', token: b.token, status: 403 });
    await call(`/faults/tickets/${ticket.id}/accept`, { method: 'PATCH', token: admin });
  });
  await check('换机迁移会话并保留原费率，原故障机仍等待维修', async () => {
    await call(`/faults/tickets/${ticket.id}/transfer`, { method: 'PATCH', token: admin, body: { newMachineId: seats[1].id } });
    const current = (await call('/billing/sessions', { token: a.token }))[0];
    assert.equal(current.id, session.id); assert.equal(current.machineId, seats[1].id); assert.equal(current.hourlyRate, session.hourlyRate);
    assert.equal((await call(`/machines/${session.machineId}`)).status, 'fault');
    await call(`/faults/tickets/${ticket.id}/resolve`, { method: 'PATCH', token: admin, body: { resolution: '本地测试已修复' } });
  });
  await check('并发重复结算只扣一次，生成保洁任务', async () => {
    const before = Number((await profile(a.token)).balance);
    const [ended, duplicate] = await Promise.all([1, 2].map(() => call(`/billing/sessions/${session.id}/end`, { method: 'PATCH', token: a.token })));
    assert.equal(ended.id, duplicate.id); assert.equal(ended.status, 'completed');
    assert.ok(Math.abs(Number((await profile(a.token)).balance) - (before - Number(ended.amount))) < 0.001);
    const tx = await call('/billing/transactions', { token: a.token });
    assert.equal(tx.filter(row => row.referenceId === String(session.id) && row.type === 'consume').length, 1);
    assert.equal((await call(`/machines/${seats[1].id}`)).status, 'dirty');
  });
  await check('保洁必须先开始再完成，完成后座位恢复可选', async () => {
    const tasks = await call('/cleaning/tasks/pending', { token: admin });
    for (const machine of [seats[0], seats[1]]) {
      const task = tasks.find(task => task.machineId === machine.id);
      assert.ok(task);
      await call(`/cleaning/tasks/${task.id}/complete`, { method: 'POST', token: admin, status: 400 });
      await call(`/cleaning/tasks/${task.id}/start`, { method: 'POST', token: admin, status: 201 });
      await call(`/cleaning/tasks/${task.id}/complete`, { method: 'POST', token: admin, status: 201 });
      assert.equal((await call(`/machines/${machine.id}`)).status, 'offline');
    }
    await call('/orders', { method: 'POST', token: a.token, body: { requestId: randomUUID(), items: [{ itemId: 5, qty: 1 }] }, status: 400 });
  });
  await check('员工资料不返回密码，报表日期过滤与退款净额正确', async () => {
    const staff = await call('/auth/profile', { token: admin });
    assert.equal(Object.hasOwn(staff, 'password'), false);
    const future = await call('/analytics/overview?from=2099-01-01&to=2099-01-02', { token: admin });
    assert.equal(future.sessions, 0); assert.equal(future.revenue, 0); assert.equal(future.faultCount, 0);
    const overview = await call('/analytics/overview', { token: admin });
    const transactions = await call('/billing/transactions', { token: admin });
    const net = transactions.reduce((sum, row) => sum + (row.type === 'consume' ? Number(row.amount) : row.type === 'refund' ? -Number(row.amount) : 0), 0);
    assert.ok(Math.abs(overview.revenue - Math.round(net * 100) / 100) < 0.001);
    await call('/analytics/overview?from=not-a-date', { token: admin, status: 400 });
  });
  const report = { checkedAt: new Date().toISOString(), base, passed: checks.length, checks };
  mkdirSync(resolve('.local'), { recursive: true }); writeFileSync(resolve('.local/smoke-results.json'), JSON.stringify(report, null, 2));
  console.log(`\n${checks.length}项本地业务检查全部通过，测试新增用户与记录保留在演示库。`);
} catch (error) { console.error(error); process.exitCode = 1; }
