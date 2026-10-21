import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { RechargeRequestId1792542600000 } from '../src/database/migrations/1792542600000-RechargeRequestId';
import { OrderRequestId1792543800000 } from '../src/database/migrations/1792543800000-OrderRequestId';
import { SettlementRequestedAt1792545000000 } from '../src/database/migrations/1792545000000-SettlementRequestedAt';
import { OrderService } from '../src/modules/order/order.service';
import { MENU } from '../src/modules/order/menu';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import * as request from 'supertest';
import { EventsGateway } from '../src/common/gateway/events.gateway';
import { localTransaction } from '../src/common/local-transaction';
import { AuthModule } from '../src/modules/auth/auth.module';
import { BillingModule } from '../src/modules/billing/billing.module';
import { Transaction } from '../src/modules/billing/transaction.entity';
import { Staff } from '../src/modules/user/staff.entity';
import { User } from '../src/modules/user/user.entity';
import { UserModule } from '../src/modules/user/user.module';
import { UserService } from '../src/modules/user/user.service';
import { Area } from '../src/modules/area/area.entity';
import { Machine } from '../src/modules/machine/machine.entity';
import { Session } from '../src/modules/billing/session.entity';
import { BillingService } from '../src/modules/billing/billing.service';
import { CleaningTask } from '../src/modules/cleaning/cleaning-task.entity';
import { FaultTicket } from '../src/modules/fault/fault-ticket.entity';
import { FaultModule } from '../src/modules/fault/fault.module';
import { FaultType } from '../src/modules/fault/fault-type.entity';
import { FaultService } from '../src/modules/fault/fault.service';
import { OrderModule } from '../src/modules/order/order.module';
import { Order } from '../src/modules/order/order.entity';
import { AnalyticsModule } from '../src/modules/analytics/analytics.module';
import { ShiftModule } from '../src/modules/shift/shift.module';
import { WakeupModule } from '../src/modules/wakeup/wakeup.module';
import { WakeUpConfig } from '../src/modules/wakeup/wake-up-config.entity';
import { WakeupService } from '../src/modules/wakeup/wakeup.service';
import { BountyModule } from '../src/modules/bounty/bounty.module';
import { BountyTask } from '../src/modules/bounty/bounty-task.entity';
import { UserTaskProgress } from '../src/modules/bounty/user-task-progress.entity';

describe('敏感接口授权与账户字段保护（独立内存数据库）', () => {
  let app: INestApplication;
  let source: DataSource;
  let jwt: JwtService;
  let userId: number;
  const roles = ['admin', 'manager', 'cashier', 'technician', 'cleaner'];
  const actorId = (role: string) => Math.max(1, roles.indexOf(role) + 1);
  const token = (role?: string) => jwt.sign({ sub: actorId(role || ''), role });
  const auth = (role?: string) => `Bearer ${token(role)}`;
  const account = () => source.getRepository(User).findOneByOrFail({ id: userId });

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
        TypeOrmModule.forRoot({
          type: 'better-sqlite3', database: ':memory:',
          autoLoadEntities: true, synchronize: true,
        }),
        AuthModule, UserModule, BillingModule, FaultModule, OrderModule, AnalyticsModule, ShiftModule,
        WakeupModule, BountyModule,
      ],
    })
      .overrideProvider(ConfigService)
      .useValue(new ConfigService({ JWT_SECRET: 'isolated-security-test-secret', JWT_EXPIRES_IN: '1h' }))
      .overrideProvider(EventsGateway)
      .useValue({ broadcastMachineUpdate: jest.fn(), broadcastTicketCreated: jest.fn(), broadcastTicketUpdate: jest.fn() })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    source = app.get(DataSource);
    jwt = app.get(JwtService);
  });

  beforeEach(async () => {
    // Every case owns a fresh schema. No project database or .env file is used.
    await source.synchronize(true);
    for (const role of roles) {
      await source.getRepository(Staff).save({
        id: actorId(role), username: role, name: role, role, password: 'unused-in-token-tests',
      });
    }
    const user = await source.getRepository(User).save({
      nickname: '原会员', phone: '13800138001', balance: 30, bonusBalance: 5,
      credits: 7, totalSpent: 100, totalHours: 2,
    });
    userId = user.id;
  });

  afterAll(async () => { await app?.close(); });

  describe('低余额结算固定账单与恢复边界', () => {
    const clock = new Date('2026-10-21T01:05:00.000Z');
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'queueMicrotask', 'setImmediate', 'clearImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'hrtime', 'performance'] });
      jest.setSystemTime(clock);
    });
    afterEach(() => { jest.useRealTimers(); });
    const end = (id: number, role = 'customer') => request(app.getHttpServer()).patch(`/billing/sessions/${id}/end`)
      .set('Authorization', auth(role));
    const session = (id: number) => source.getRepository(Session).findOneByOrFail({ id });
    async function lowBalance() {
      const billing = await seedBilling();
      await source.getRepository(User).update(userId, { balance: 0.5 });
      return { ...billing, id: billing.ownId! };
    }
    const recharge = (amount: number) => request(app.getHttpServer()).post('/billing/recharge')
      .set('Authorization', auth('cashier')).send({ requestId: randomUUID(), userId, amount, paymentMethod: 'cash' });

    it('欠费申请结算提交固定账单，不扣部分余额、不释放座位，时间前进后仍不涨价', async () => {
      const { id } = await lowBalance();
      const first = await end(id).expect(409);
      expect(first.body).toMatchObject({ code: 'SETTLEMENT_PAYMENT_REQUIRED', amount: 2, balance: 0.5, shortfall: 1.5 });
      const frozen = await session(id);
      expect(frozen.status).toBe('paused');
      expect(frozen.settlementRequestedAt).toEqual(clock);
      expect(frozen.duration).toBe(2);
      expect(Number(frozen.amount)).toBe(2);
      expect(frozen.endTime).toBeNull();
      jest.setSystemTime(clock.getTime() + 10 * 60000);
      const repeat = await end(id).expect(409);
      expect(repeat.body).toEqual(first.body);
      const active = await request(app.getHttpServer()).get('/billing/sessions').set('Authorization', auth('customer')).expect(200);
      expect(active.body[0]).toMatchObject({ duration: 2, amount: 2, status: 'paused', settlementRequestedAt: clock.toISOString() });
      expect((await session(id)).updatedAt).toEqual(frozen.updatedAt);
      expect(Number((await account()).balance)).toBe(0.5);
      expect(await source.getRepository(Transaction).count()).toBe(0);
      expect(await source.getRepository(CleaningTask).count()).toBe(0);
      expect(await source.getRepository(Machine).findOneByOrFail({ id: 'B-01' })).toMatchObject({ status: 'online', sessionId: id, currentUserId: userId });
    });

    it('补足后并发重试只扣固定金额一次，并在实际释放时创建保洁', async () => {
      const { id } = await lowBalance();
      await end(id).expect(409);
      await recharge(1.5).expect(201);
      jest.setSystemTime(clock.getTime() + 10 * 60000);
      const replies = await Promise.all([1, 2, 3].map(() => end(id)));
      expect(replies.map(reply => reply.status)).toEqual([200, 200, 200]);
      for (const reply of replies) expect(reply.body).toMatchObject({ amount: 2, duration: 2, status: 'completed', endTime: clock.toISOString() });
      expect(Number((await account()).balance)).toBe(0);
      expect(await source.getRepository(Transaction).count({ where: { type: 'consume' } })).toBe(1);
      const tasks = await source.getRepository(CleaningTask).find();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].createdAt).toEqual(new Date(clock.getTime() + 10 * 60000));
      expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-01' })).status).toBe('dirty');
    });

    it('原本暂停的尾部等待不计入账单，暂停记录保持一致', async () => {
      const { id } = await lowBalance();
      await request(app.getHttpServer()).patch(`/billing/sessions/${id}/pause`).set('Authorization', auth('customer')).expect(200);
      jest.setSystemTime(clock.getTime() + 5 * 60000);
      await end(id).expect(409);
      expect((await session(id)).pausedAt).toEqual(clock);
      await recharge(1.5).expect(201);
      jest.setSystemTime(clock.getTime() + 10 * 60000);
      const result = await end(id).expect(200);
      expect(result.body).toMatchObject({ duration: 2, amount: 2, pausedDuration: 5, pausedAt: null, endTime: new Date(clock.getTime() + 5 * 60000).toISOString() });
    });

    it.each([0.01, 0.29, 2])('余额恰好足够¥%s时可以结算到零', async amount => {
      const { ownId } = await seedBilling();
      await source.getRepository(Session).update(ownId!, { startTime: new Date(clock.getTime() - 60000), hourlyRate: amount * 60 });
      await source.getRepository(User).update(userId, { balance: amount });
      const result = await end(ownId!).expect(200);
      expect(Number(result.body.amount)).toBe(amount);
      expect(result.body.settlementRequestedAt).toBeNull();
      expect(Number((await account()).balance)).toBe(0);
    });

    it.each([[59999, 1], [60000, 1], [60001, 2]])('计费时长%s毫秒向上取整为%s分钟', async (elapsed, minutes) => {
      const { ownId } = await seedBilling();
      await source.getRepository(Session).update(ownId!, { startTime: new Date(clock.getTime() - elapsed) });
      const result = await end(ownId!).expect(200);
      expect(result.body).toMatchObject({ duration: minutes, amount: minutes });
    });

    it('零费率会话余额为零也能完成结算', async () => {
      const { ownId } = await seedBilling();
      await source.getRepository(Session).update(ownId!, { hourlyRate: 0 });
      await source.getRepository(User).update(userId, { balance: 0 });
      const result = await end(ownId!).expect(200);
      expect(result.body.amount).toBe(0);
      expect(Number((await account()).balance)).toBe(0);
    });

    it.each(['customer', 'cashier'])('%s不能恢复欠费待结算会话，充值后仍须完成原结算', async role => {
      const { id } = await lowBalance();
      await end(id).expect(409);
      await recharge(20).expect(201);
      await request(app.getHttpServer()).patch(`/billing/sessions/${id}/resume`).set('Authorization', auth(role)).expect(400);
      expect((await session(id)).status).toBe('paused');
    });

    it('待结算期间不能新点单、唤醒、新上机或抢占原座位；原订单仍可确认', async () => {
      const { id, otherId } = await lowBalance();
      await source.getRepository(User).update(userId, { balance: 30 });
      const data = { requestId: randomUUID(), items: [{ itemId: 5, qty: 1 }] };
      const original = await request(app.getHttpServer()).post('/orders').set('Authorization', auth('customer')).send(data).expect(201);
      await source.getRepository(User).update(userId, { balance: 0.5 });
      await end(id).expect(409);
      await recharge(20).expect(201);
      await request(app.getHttpServer()).post('/orders').set('Authorization', auth('customer')).send({ ...data, requestId: randomUUID() }).expect(400);
      const replay = await request(app.getHttpServer()).post('/orders').set('Authorization', auth('customer')).send(data).expect(201);
      expect(replay.body.id).toBe(original.body.id);
      await request(app.getHttpServer()).post('/wakeup/configs').set('Authorization', auth('customer')).send({ machineId: 'B-01', wakeTime: '10:00' }).expect(400);
      await request(app.getHttpServer()).post('/billing/sessions').set('Authorization', auth('customer')).send({ userId, machineId: 'B-03' }).expect(400);
      await request(app.getHttpServer()).post('/billing/sessions').set('Authorization', auth('cashier')).send({ userId: otherId, machineId: 'B-01' }).expect(400);
      expect((await session(id)).machineId).toBe('B-01');
    });

    it('待结算会话不能通过故障换机继续使用', async () => {
      const { ownId, ownTicketId } = await seedFaults();
      await source.getRepository(User).update(userId, { balance: 0.5 });
      await end(ownId!).expect(409);
      await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/accept`).set('Authorization', auth('technician')).send({}).expect(200);
      await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/transfer`).set('Authorization', auth('technician')).send({ newMachineId: 'B-03' }).expect(400);
      expect((await session(ownId!)).machineId).toBe('B-01');
      expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-03' })).status).toBe('offline');
    });

    it('补款后流水失败回滚，仍保持原固定账单和占用，可再次结算', async () => {
      const { id } = await lowBalance();
      await end(id).expect(409);
      const frozen = await session(id);
      await recharge(1.5).expect(201);
      await source.query("CREATE TRIGGER reject_final_settlement BEFORE INSERT ON transactions WHEN NEW.type = 'consume' BEGIN SELECT RAISE(ABORT, 'injected settlement failure'); END");
      try {
        await end(id).expect(500);
        expect(Number((await account()).balance)).toBe(2);
        expect(await session(id)).toMatchObject({ status: 'paused', amount: frozen.amount, settlementRequestedAt: frozen.settlementRequestedAt });
        expect(await source.getRepository(CleaningTask).count()).toBe(0);
        expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-01' })).sessionId).toBe(id);
      } finally { await source.query('DROP TRIGGER reject_final_settlement'); }
      await end(id).expect(200);
      expect(Number((await account()).balance)).toBe(0);
    });

    it('增量迁移为旧会话补可空结算申请时间并保留旧记录', async () => {
      const legacy = await new DataSource({ type: 'better-sqlite3', database: ':memory:' }).initialize();
      const runner = legacy.createQueryRunner();
      try {
        await runner.query('CREATE TABLE sessions (id INTEGER PRIMARY KEY, amount DECIMAL NOT NULL)');
        await runner.query('INSERT INTO sessions (id, amount) VALUES (1, 2)');
        const migration = new SettlementRequestedAt1792545000000();
        await migration.up(runner);
        await migration.up(runner);
        expect(await runner.query('SELECT * FROM sessions')).toEqual([{ id: 1, amount: 2, settlement_requested_at: null }]);
      } finally { await runner.release(); await legacy.destroy(); }
    });
  });

  describe('订单请求幂等与扣款回滚', () => {
    const command = () => ({ requestId: randomUUID(), items: [{ itemId: 5, qty: 1 }], remark: '' });
    const post = (data: object, role = 'customer') => request(app.getHttpServer()).post('/orders')
      .set('Authorization', auth(role)).send(data);
    const result = (id: string, role = 'customer') => request(app.getHttpServer()).get(`/orders/requests/${id}`)
      .set('Authorization', auth(role));

    it('同编号并发和重放只生成一单、一笔扣款', async () => {
      await seedBilling();
      const data = command();
      const replies = await Promise.all([1, 2, 3].map(() => post(data)));
      expect(replies.map(reply => reply.status)).toEqual([201, 201, 201]);
      expect(new Set(replies.map(reply => reply.body.id)).size).toBe(1);
      const replay = await post({ ...data, requestId: data.requestId.toUpperCase() }).expect(201);
      expect(replay.body).toEqual(replies[0].body);
      expect(await source.getRepository(Order).count()).toBe(1);
      expect(await source.getRepository(Transaction).count()).toBe(1);
      expect(Number((await account()).balance)).toBe(24);
      const queried = await result(data.requestId).expect(200);
      expect(queried.body).toEqual(replies[0].body);
      expect(queried.body).toMatchObject({ createdById: userId, createdByType: 'customer', machineId: 'B-01', total: 6 });
    });

    it.each(['quantity', 'product', 'remark', 'actor'])('同编号变更%s返回409，不再次扣款', async field => {
      await seedBilling();
      const data = command();
      await post(data).expect(201);
      const changed = { ...data, items: [...data.items] };
      if (field === 'quantity') changed.items = [{ itemId: 5, qty: 2 }];
      if (field === 'product') changed.items = [{ itemId: 4, qty: 1 }];
      if (field === 'remark') changed.remark = '新备注';
      await post(field === 'actor' ? { ...changed, userId } : changed, field === 'actor' ? 'admin' : 'customer').expect(409);
      expect(await source.getRepository(Order).count()).toBe(1);
      expect(Number((await account()).balance)).toBe(24);
    });

    it.each(['admin', 'manager', 'cashier'])('%s 下单记录真实员工与会员，两种身份命名空间隔离', async role => {
      const { otherId } = await seedBilling();
      const data = { ...command(), userId };
      const created = await post(data, role).expect(201);
      expect(created.body).toMatchObject({ createdById: actorId(role), createdByType: 'staff', userId });
      await result(data.requestId, role).expect(200);
      await result(data.requestId, 'customer').expect(404);
      await result(data.requestId, 'cleaner').expect(403);
      await post({ ...data, userId: otherId }, role).expect(409);
      expect(Number((await account()).balance)).toBe(24);
    });

    it('其他顾客与同编号员工均不能查询原顾客请求', async () => {
      const { otherId } = await seedBilling();
      const data = command();
      await result(data.requestId).expect(404);
      await post(data).expect(201);
      await request(app.getHttpServer()).get(`/orders/requests/${data.requestId}`)
        .set('Authorization', `Bearer ${jwt.sign({ sub: otherId, role: 'customer' })}`).expect(404);
      await result(data.requestId, 'admin').expect(404);
      await result('invalid').expect(400);
    });

    it('商品顺序不影响重试，改价后重放保留原价快照', async () => {
      await seedBilling();
      const data = { ...command(), items: [{ itemId: 5, qty: 1 }, { itemId: 4, qty: 1 }] };
      const first = await post(data).expect(201);
      const product = MENU.find(item => item.id === 5)!;
      const oldPrice = product.price;
      try {
        product.price = 99;
        const replay = await post({ ...data, items: [...data.items].reverse() }).expect(201);
        expect(replay.body).toEqual(first.body);
        expect(Number(replay.body.total)).toBe(18);
      } finally { product.price = oldPrice; }
      expect(Number((await account()).balance)).toBe(12);
    });

    it('取消退款后重试返回取消状态，结束上机也不阻止原单确认', async () => {
      const { ownId } = await seedBilling();
      const data = command();
      const first = await post(data).expect(201);
      await request(app.getHttpServer()).patch(`/orders/${first.body.id}/status`)
        .set('Authorization', auth('cashier')).send({ status: 'cancelled' }).expect(200);
      await source.getRepository(Session).update(ownId!, { status: 'completed' });
      const replay = await post(data).expect(201);
      expect(replay.body.status).toBe('cancelled');
      const lookup = await result(data.requestId).expect(200);
      expect(lookup.body.status).toBe('cancelled');
      expect(Number((await account()).balance)).toBe(30);
      expect(await source.getRepository(Order).count()).toBe(1);
      expect(await source.getRepository(Transaction).count()).toBe(2);
    });

    it.each([undefined, null, '', 'invalid'])('非法请求编号%j不创建订单', async requestId => {
      await post({ ...command(), requestId }).expect(400);
      expect(await source.getRepository(Order).count()).toBe(0);
    });

    it.each([
      { items: null }, { items: '[]' }, { items: [] }, { items: [null] }, { items: [3] },
      { items: [{ itemId: 5, qty: 0 }] }, { items: [{ itemId: 5, qty: 21 }] },
      { items: [{ itemId: 5, qty: 1.5 }] }, { items: [{ itemId: '5', qty: 1 }] },
      { items: [{ itemId: 999, qty: 1 }] },
      { items: [{ itemId: 5, qty: 1 }, { itemId: 5, qty: 1 }] },
      { remark: null }, { remark: 'x'.repeat(256) }, { total: 0.01 }, { machineId: 'B-02' },
      { items: [{ itemId: 5, qty: 1, price: 0.01 }] }, { status: 'completed' }, { createdById: 999 },
    ])('非法商品或实体注入%j不扣款', async invalid => {
      await seedBilling();
      await post({ ...command(), ...invalid }).expect(400);
      expect(await source.getRepository(Order).count()).toBe(0);
      expect(await source.getRepository(Transaction).count()).toBe(0);
      expect(Number((await account()).balance)).toBe(30);
    });

    it('不同编号代表新订单，各扣一次且编号唯一约束在数据库生效', async () => {
      await seedBilling();
      const first = await post(command()).expect(201);
      await post(command()).expect(201);
      const row = await source.getRepository(Order).findOneByOrFail({ id: first.body.id });
      const { id, ...duplicate } = row;
      await expect(source.getRepository(Order).insert(duplicate)).rejects.toThrow();
      expect(await source.getRepository(Order).count()).toBe(2);
      expect(Number((await account()).balance)).toBe(18);
    });

    it('流水写入失败时订单和扣款一起回滚，原编号可重试', async () => {
      await seedBilling();
      const data = command();
      await source.query("CREATE TRIGGER reject_order_payment BEFORE INSERT ON transactions BEGIN SELECT RAISE(ABORT, 'injected order payment failure'); END");
      try {
        await post(data).expect(500);
        expect(await source.getRepository(Order).count()).toBe(0);
        expect(Number((await account()).balance)).toBe(30);
        await result(data.requestId).expect(404);
      } finally { await source.query('DROP TRIGGER reject_order_payment'); }
      await post(data).expect(201);
      expect(Number((await account()).balance)).toBe(24);
    });

    it('订单结果不暴露同连接中最终回滚的未提交记录', async () => {
      const requestId = randomUUID();
      let inserted!: () => void;
      let release!: () => void;
      const ready = new Promise<void>(resolve => { inserted = resolve; });
      const gate = new Promise<void>(resolve => { release = resolve; });
      const mutation = localTransaction(source, async manager => {
        await manager.save(Order, manager.create(Order, { requestId, userId, total: 6, createdById: userId, createdByType: 'customer' }));
        inserted();
        await gate;
        throw new Error('rollback uncommitted order');
      });
      await ready;
      const lookup = app.get(OrderService).getRequestResult(requestId, { id: userId, role: 'customer' });
      const rejected = expect(mutation).rejects.toThrow('rollback uncommitted order');
      release();
      await rejected;
      await expect(lookup).rejects.toThrow('尚未查到');
    });

    it('旧订单表增量迁移保留数据、空编号并存并增加唯一索引', async () => {
      const legacy = await new DataSource({ type: 'better-sqlite3', database: ':memory:' }).initialize();
      const runner = legacy.createQueryRunner();
      try {
        await runner.query('CREATE TABLE orders (id INTEGER PRIMARY KEY, total DECIMAL NOT NULL)');
        await runner.query('INSERT INTO orders (id, total) VALUES (1, 6), (2, 12)');
        const migration = new OrderRequestId1792543800000();
        await migration.up(runner);
        await migration.up(runner);
        const rows = await runner.query('SELECT * FROM orders ORDER BY id');
        expect(rows.map(row => ({ id: row.id, total: row.total, requestId: row.request_id, actor: row.created_by_id })))
          .toEqual([{ id: 1, total: 6, requestId: null, actor: null }, { id: 2, total: 12, requestId: null, actor: null }]);
        const id = randomUUID();
        await runner.query('INSERT INTO orders (id, total, request_id) VALUES (3, 6, ?)', [id]);
        await expect(runner.query('INSERT INTO orders (id, total, request_id) VALUES (4, 6, ?)', [id])).rejects.toThrow();
      } finally { await runner.release(); await legacy.destroy(); }
    });
  });

  describe('充值幂等与结果确认', () => {
    const command = () => ({ requestId: randomUUID(), userId, amount: 12.34, paymentMethod: 'cash' });
    const post = (data: object, role = 'cashier') => request(app.getHttpServer()).post('/billing/recharge')
      .set('Authorization', auth(role)).send(data);
    const result = (id: string, role = 'cashier') => request(app.getHttpServer()).get(`/billing/recharges/${id}`)
      .set('Authorization', auth(role));

    it.each([undefined, null, '', 'same-request', '00000000-0000-0000-0000-000000000000'])
      ('缺失或非法请求编号 %j 拒绝入账', async requestId => {
        await post({ ...command(), requestId }).expect(400);
        expect(Number((await account()).balance)).toBe(30);
        expect(await source.getRepository(Transaction).count()).toBe(0);
      });

    it('同编号重复和并发请求返回同一流水，只入账一次', async () => {
      const data = command();
      const replies = await Promise.all([1, 2, 3].map(() => post(data)));
      expect(replies.map(reply => reply.status)).toEqual([201, 201, 201]);
      expect(new Set(replies.map(reply => reply.body.id)).size).toBe(1);
      const replay = await post({ ...data, requestId: data.requestId.toUpperCase() }).expect(201);
      expect(replay.body).toEqual(replies[0].body);
      expect(Number((await account()).balance)).toBe(42.34);
      expect(await source.getRepository(Transaction).count()).toBe(1);
      const lookup = await result(data.requestId).expect(200);
      expect(lookup.body).toEqual(replies[0].body);
    });

    it.each(['userId', 'amount', 'paymentMethod', 'operatorId'])('同编号改变 %s 返回409且不入账', async field => {
      const data = command();
      await post(data).expect(201);
      const changed = { ...data };
      let role = 'cashier';
      if (field === 'userId') changed.userId = (await source.getRepository(User).save({ nickname: '其他人', balance: 100 })).id;
      if (field === 'amount') changed.amount = 20;
      if (field === 'paymentMethod') changed.paymentMethod = 'alipay';
      if (field === 'operatorId') role = 'manager';
      await post(changed, role).expect(409);
      expect(Number((await account()).balance)).toBe(42.34);
      expect(await source.getRepository(Transaction).count()).toBe(1);
    });

    it('另一笔合法充值使用新编号，重放旧编号仍返回原余额快照', async () => {
      const first = command();
      const saved = await post(first).expect(201);
      await post({ ...first, requestId: randomUUID() }).expect(201);
      const replay = await post(first).expect(201);
      expect(replay.body).toEqual(saved.body);
      expect(Number(replay.body.balanceAfter)).toBe(42.34);
      expect(Number((await account()).balance)).toBe(54.68);
      expect(await source.getRepository(Transaction).count()).toBe(2);
    });

    it('结果查询仅限原操作员，查不到结果后仍可用原编号提交', async () => {
      const data = command();
      await result(data.requestId).expect(404);
      await post(data).expect(201);
      await result(data.requestId, 'manager').expect(404);
      await result(data.requestId).expect(200);
      await result('invalid-uuid').expect(400);
    });

    it.each(['customer', 'technician', 'cleaner', 'owner', undefined])('%s 不能查询充值请求结果', async role => {
      const data = command();
      await post(data).expect(201);
      // Do not let default parameters convert undefined into cashier.
      await request(app.getHttpServer()).get(`/billing/recharges/${data.requestId}`)
        .set('Authorization', auth(role)).expect(403);
    });

    it('入账流水失败时余额与请求编号一起回滚，原编号可以重试', async () => {
      const data = command();
      await source.query("CREATE TRIGGER reject_recharge BEFORE INSERT ON transactions BEGIN SELECT RAISE(ABORT, 'injected transaction failure'); END");
      try {
        await post(data).expect(500);
        expect(Number((await account()).balance)).toBe(30);
        expect(await source.getRepository(Transaction).count()).toBe(0);
        await result(data.requestId).expect(404);
      } finally {
        await source.query('DROP TRIGGER reject_recharge');
      }
      await post(data).expect(201);
      expect(Number((await account()).balance)).toBe(42.34);
      expect(await source.getRepository(Transaction).count()).toBe(1);
    });

    it('数据库拒绝重复请求编号，历史空编号流水仍可并存', async () => {
      const data = command();
      const response = await post(data).expect(201);
      const repository = source.getRepository(Transaction);
      await expect(repository.insert({ ...response.body, id: undefined })).rejects.toThrow();
      await repository.insert([
        { userId, type: 'consume', amount: 1, balanceAfter: 1 },
        { userId, type: 'consume', amount: 1, balanceAfter: 0 },
      ]);
      expect(await repository.count()).toBe(3);
    });

    it('服务层拒绝无编号调用，不可绕过HTTP校验入账', async () => {
      await expect(app.get(BillingService).recharge(userId, 1, 'cash', 3, undefined as any)).rejects.toThrow();
      await expect(app.get(BillingService).getRechargeResult(randomUUID(), undefined as any)).rejects.toThrow();
      expect(Number((await account()).balance)).toBe(30);
    });

    it('结果确认不读取同连接内最终回滚的未提交流水', async () => {
      const requestId = randomUUID();
      let inserted!: () => void;
      let release!: () => void;
      const ready = new Promise<void>(resolve => { inserted = resolve; });
      const gate = new Promise<void>(resolve => { release = resolve; });
      const mutation = localTransaction(source, async manager => {
        await manager.save(Transaction, manager.create(Transaction, {
          requestId, userId, operatorId: 3, type: 'recharge', amount: 1, balanceAfter: 31,
        }));
        inserted();
        await gate;
        throw new Error('rollback after insert');
      });
      await ready;
      const lookup = app.get(BillingService).getRechargeResult(requestId, 3);
      const rejected = expect(mutation).rejects.toThrow('rollback after insert');
      release();
      await rejected;
      await expect(lookup).rejects.toThrow('尚未查到');
      expect(await source.getRepository(Transaction).count()).toBe(0);
    });

    it('增量迁移保留已有流水，增加允许空值的唯一请求编号', async () => {
      const legacy = await new DataSource({ type: 'better-sqlite3', database: ':memory:' }).initialize();
      const runner = legacy.createQueryRunner();
      try {
        await runner.query('CREATE TABLE transactions (id INTEGER PRIMARY KEY, amount DECIMAL NOT NULL)');
        await runner.query('INSERT INTO transactions (id, amount) VALUES (1, 30), (2, 20)');
        const migration = new RechargeRequestId1792542600000();
        await migration.up(runner);
        await migration.up(runner); // Compatible with a schema already synchronized locally.
        expect(await runner.query('SELECT * FROM transactions ORDER BY id')).toEqual([
          { id: 1, amount: 30, request_id: null }, { id: 2, amount: 20, request_id: null },
        ]);
        const id = randomUUID();
        await runner.query('INSERT INTO transactions (id, amount, request_id) VALUES (3, 10, ?)', [id]);
        await expect(runner.query('INSERT INTO transactions (id, amount, request_id) VALUES (4, 10, ?)', [id])).rejects.toThrow();
      } finally {
        await runner.release();
        await legacy.destroy();
      }
    });
  });

  describe('顾客扩展接口主体隔离', () => {
    const wakeData = { machineId: 'B-01', wakeTime: '08:30' };
    const createWake = (data: object = wakeData) => request(app.getHttpServer()).post('/wakeup/configs')
      .set('Authorization', auth('customer')).send(data);
    const wakeRepo = () => source.getRepository(WakeUpConfig);
    const progressRepo = () => source.getRepository(UserTaskProgress);
    const seedWake = (status = 'scheduled') => wakeRepo().save({ userId, ...wakeData, status });
    async function seedProgress(ownerId = userId, status = 'completed') {
      await source.getRepository(BountyTask).save({
        id: 'test-task', type: 'checkin', name: '测试任务', description: '隔离夹具',
        rewardType: 'credit', rewardAmount: 10, conditions: '{}',
      });
      return progressRepo().save({ userId: ownerId, taskId: 'test-task', status, progress: 1 });
    }

    it('无令牌不能访问唤醒或悬赏', async () => {
      await request(app.getHttpServer()).get('/wakeup/configs').expect(401);
      await request(app.getHttpServer()).get('/bounty/progress').expect(401);
    });

    it.each([...roles, 'owner', undefined])('%s 不能把员工编号当作会员访问扩展接口', async role => {
      const config = await seedWake();
      const progress = await seedProgress();
      for (const path of ['/wakeup/configs', '/bounty/tasks', '/bounty/tasks/test-task', '/bounty/progress']) {
        await request(app.getHttpServer()).get(path).set('Authorization', auth(role)).expect(403);
      }
      await request(app.getHttpServer()).post('/wakeup/configs').set('Authorization', auth(role))
        .send(wakeData).expect(403);
      await request(app.getHttpServer()).delete(`/wakeup/configs/${config.id}`)
        .set('Authorization', auth(role)).expect(403);
      await request(app.getHttpServer()).post('/bounty/tasks/test-task/claim')
        .set('Authorization', auth(role)).send({}).expect(403);
      expect((await wakeRepo().findOneByOrFail({ id: config.id })).status).toBe('scheduled');
      expect((await progressRepo().findOneByOrFail({ id: progress.id })).status).toBe('completed');
    });

    it.each([0, -1, '1', null])('非法顾客身份 %j 不能退化为全量扩展查询', async sub => {
      const authorization = `Bearer ${jwt.sign({ sub, role: 'customer' })}`;
      for (const path of ['/wakeup/configs', '/bounty/progress']) {
        await request(app.getHttpServer()).get(path).set('Authorization', authorization).expect(403);
      }
    });

    it.each(['id', 'userId', 'status', 'createdAt', 'updatedAt'])('拒绝唤醒配置注入 %s', async field => {
      await seedBilling();
      const existing = await seedWake();
      await createWake({ ...wakeData, [field]: field === 'status' ? 'completed' : existing.id }).expect(400);
      expect(await wakeRepo().count()).toBe(1);
      expect((await wakeRepo().findOneByOrFail({ id: existing.id })).status).toBe('scheduled');
    });

    it.each([
      { wakeTime: '24:00' }, { wakeTime: '08:60' }, { wakeTime: null },
      { machineId: ' ' }, { machineId: 'x'.repeat(21) },
      { headphone: 'false' }, { screen: null }, { humanWake: 1 },
      { snoozeInterval: 0 }, { snoozeInterval: 31 }, { snoozeInterval: 1.5 },
      { maxSnooze: -1 }, { maxSnooze: 11 }, { maxSnooze: null },
    ])('非法唤醒参数 %j 不入库', async invalid => {
      await createWake({ ...wakeData, ...invalid }).expect(400);
      expect(await wakeRepo().count()).toBe(0);
    });

    it('唤醒只允许本人当前会话，保留false和0并按本人查询', async () => {
      const { otherId, ownId } = await seedBilling();
      await createWake({ ...wakeData, machineId: 'B-02' }).expect(400);
      await createWake({ ...wakeData, machineId: 'B-03' }).expect(400);
      await source.getRepository(Session).update(ownId!, { status: 'paused' });
      const created = await createWake({ ...wakeData, headphone: false, maxSnooze: 0 }).expect(201);
      expect(created.body).toMatchObject({ userId, status: 'scheduled', headphone: false, maxSnooze: 0, screen: true });
      await wakeRepo().save({ userId: otherId, machineId: 'B-02', wakeTime: '10:00' });
      const mine = await request(app.getHttpServer()).get(`/wakeup/configs?userId=${otherId}`)
        .set('Authorization', auth('customer')).expect(200);
      expect(mine.body.map((row: WakeUpConfig) => row.id)).toEqual([created.body.id]);
      await source.getRepository(Session).update(ownId!, { status: 'completed' });
      await createWake().expect(400);
    });

    it('服务层也不复制唤醒实体身份和状态字段', async () => {
      await seedBilling();
      const existing = await seedWake();
      const created = await app.get(WakeupService).create(userId, {
        ...wakeData, id: existing.id, userId: 999, status: 'completed',
      } as any);
      expect(created.id).not.toBe(existing.id);
      expect(created.userId).toBe(userId);
      expect(created.status).toBe('scheduled');
      expect(await wakeRepo().count()).toBe(2);
    });

    it('其他顾客不能取消，重复取消本人配置不改时间', async () => {
      const { otherId } = await seedBilling();
      const config = await seedWake();
      const foreignAuth = `Bearer ${jwt.sign({ sub: otherId, role: 'customer' })}`;
      await request(app.getHttpServer()).delete(`/wakeup/configs/${config.id}`)
        .set('Authorization', foreignAuth).expect(404);
      expect((await wakeRepo().findOneByOrFail({ id: config.id })).status).toBe('scheduled');
      const first = await request(app.getHttpServer()).delete(`/wakeup/configs/${config.id}`)
        .set('Authorization', auth('customer')).expect(200);
      const repeat = await request(app.getHttpServer()).delete(`/wakeup/configs/${config.id}`)
        .set('Authorization', auth('customer')).expect(200);
      expect(repeat.body).toEqual(first.body);
      const mine = await request(app.getHttpServer()).get('/wakeup/configs')
        .set('Authorization', auth('customer')).expect(200);
      expect(mine.body).toEqual([]);
    });

    it.each(['active', 'completed'])('不能取消处于 %s 状态的唤醒', async status => {
      const config = await seedWake(status);
      await request(app.getHttpServer()).delete(`/wakeup/configs/${config.id}`)
        .set('Authorization', auth('customer')).expect(400);
      expect((await wakeRepo().findOneByOrFail({ id: config.id })).status).toBe(status);
    });

    it('取消路径非法ID按400处理', async () => {
      await request(app.getHttpServer()).delete('/wakeup/configs/undefined')
        .set('Authorization', auth('customer')).expect(400);
    });

    it('悬赏进度仅返回本人记录，修复不存在的task关联查询', async () => {
      const { otherId } = await seedBilling(false);
      const own = await seedProgress();
      await seedProgress(otherId);
      const mine = await request(app.getHttpServer()).get(`/bounty/progress?userId=${otherId}`)
        .set('Authorization', auth('customer')).expect(200);
      expect(mine.body.map((row: UserTaskProgress) => row.id)).toEqual([own.id]);
      await request(app.getHttpServer()).get('/bounty/tasks').set('Authorization', auth('customer')).expect(200);
    });

    it('不能领取他人进度或注入userId，重复并发领取仅一次状态转换', async () => {
      const { otherId } = await seedBilling(false);
      const own = await seedProgress();
      await request(app.getHttpServer()).post('/bounty/tasks/test-task/claim')
        .set('Authorization', `Bearer ${jwt.sign({ sub: otherId, role: 'customer' })}`).send({}).expect(404);
      await request(app.getHttpServer()).post('/bounty/tasks/test-task/claim')
        .set('Authorization', auth('customer')).send({ userId: otherId }).expect(400);
      expect((await progressRepo().findOneByOrFail({ id: own.id })).status).toBe('completed');
      const replies = await Promise.all([1, 2].map(() => request(app.getHttpServer())
        .post('/bounty/tasks/test-task/claim').set('Authorization', auth('customer')).send({})));
      expect(replies.map(reply => reply.status).sort()).toEqual([201, 404]);
      const claimed = await progressRepo().findOneByOrFail({ id: own.id });
      expect(claimed.status).toBe('claimed');
      expect(claimed.claimedAt).toBeInstanceOf(Date);
      // This prototype records the transition only; it does not issue real rewards.
      expect((await account()).credits).toBe(7);
    });

    it('未完成的悬赏不可领取', async () => {
      const row = await seedProgress(userId, 'in_progress');
      await request(app.getHttpServer()).post('/bounty/tasks/test-task/claim')
        .set('Authorization', auth('customer')).send({}).expect(404);
      expect((await progressRepo().findOneByOrFail({ id: row.id })).status).toBe('in_progress');
    });
  });

  it('无令牌无法读取会员', async () => {
    await request(app.getHttpServer()).get('/users').expect(401);
  });

  it.each(['customer', 'cleaner', 'technician', 'owner', undefined])('%s 无权读取会员或充值', async role => {
    await request(app.getHttpServer()).get('/users').set('Authorization', auth(role)).expect(403);
    await request(app.getHttpServer()).post('/billing/recharge').set('Authorization', auth(role))
      .send({ userId, amount: 10, paymentMethod: 'cash' }).expect(403);
    expect(Number((await account()).balance)).toBe(30);
    expect(await source.getRepository(Transaction).count()).toBe(0);
  });

  it.each(['admin', 'manager', 'cashier'])('%s 可以编辑资料及记账充值，流水记录真实操作员', async role => {
    await request(app.getHttpServer()).patch(`/users/${userId}`).set('Authorization', auth(role))
      .send({ nickname: '已更新' }).expect(200);
    const response = await request(app.getHttpServer()).post('/billing/recharge').set('Authorization', auth(role))
      .send({ requestId: randomUUID(), userId, amount: 12.34, paymentMethod: 'cash' }).expect(201);
    expect(response.body.operatorId).toBe(actorId(role));
    const saved = await account();
    expect(saved.nickname).toBe('已更新');
    expect(Number(saved.balance)).toBe(42.34);
    const rows = await source.getRepository(Transaction).find();
    expect(rows).toHaveLength(1);
    expect(rows[0].operatorId).toBe(actorId(role));
    expect(Number(rows[0].balanceAfter)).toBe(42.34);
  });

  it.each(['balance', 'bonusBalance', 'credits', 'memberLevel', 'totalSpent', 'totalHours', 'openid', 'id'])
    ('拒绝通过会员创建或更新注入 %s', async field => {
      const injected = { [field]: field === 'openid' || field === 'memberLevel' ? 'injected' : 999 };
      await request(app.getHttpServer()).post('/users').set('Authorization', auth('admin'))
        .send({ nickname: '注入会员', ...injected }).expect(400);
      await request(app.getHttpServer()).patch(`/users/${userId}`).set('Authorization', auth('admin'))
        .send({ nickname: '不应更新', ...injected }).expect(400);
      const saved = await account();
      expect(saved.nickname).toBe('原会员');
      expect(Number(saved.balance)).toBe(30);
      expect(saved.credits).toBe(7);
      expect(await source.getRepository(User).count()).toBe(1);
    });

  it('会员服务本身仅复制资料白名单字段', async () => {
    const service = app.get(UserService);
    await service.update(userId, { nickname: '内部更新', balance: 999, credits: 999 } as any);
    const saved = await account();
    expect(saved.nickname).toBe('内部更新');
    expect(Number(saved.balance)).toBe(30);
    expect(saved.credits).toBe(7);
    const created = await service.create({ nickname: '新会员', balance: 999, bonusBalance: 999, credits: 999 } as any);
    expect(Number(created.balance)).toBe(0);
    expect(Number(created.bonusBalance)).toBe(0);
    expect(created.credits).toBe(0);
  });

  it.each([{ nickname: null }, { nickname: '  ' }, { phone: 'abc' }, { phone: null },
    { isActive: 'false' }, { avatar: 'javascript:alert(1)' }])('拒绝非法会员资料 %j', async data => {
    await request(app.getHttpServer()).patch(`/users/${userId}`).set('Authorization', auth('admin'))
      .send(data).expect(400);
    expect((await account()).nickname).toBe('原会员');
  });

  it('创建会员由数据库初始化账户字段，更新可正确保留 false', async () => {
    const response = await request(app.getHttpServer()).post('/users').set('Authorization', auth('cashier'))
      .send({ nickname: '新会员', phone: '13900139001' }).expect(201);
    expect(Number(response.body.balance)).toBe(0);
    expect(response.body.credits).toBe(0);
    await request(app.getHttpServer()).patch(`/users/${userId}`).set('Authorization', auth('cashier'))
      .send({ isActive: false }).expect(200);
    expect((await account()).isActive).toBe(false);
  });

  it('收银不能删除会员，管理者可以删除无业务记录的会员', async () => {
    await request(app.getHttpServer()).delete(`/users/${userId}`).set('Authorization', auth('cashier')).expect(403);
    await request(app.getHttpServer()).delete(`/users/${userId}`).set('Authorization', auth('manager')).expect(200);
  });

  it('会员路径参数必须为整数', async () => {
    await request(app.getHttpServer()).get('/users/not-a-number').set('Authorization', auth('admin')).expect(400);
  });

  it.each(['cashier', 'cleaner', 'technician'])('%s 不能改价或读写系统设置', async role => {
    await request(app.getHttpServer()).get('/settings').set('Authorization', auth(role)).expect(403);
    await request(app.getHttpServer()).put('/settings').set('Authorization', auth(role))
      .send({ defaultRate: 0 }).expect(403);
    await request(app.getHttpServer()).post('/areas').set('Authorization', auth(role))
      .send({ name: '越权区域', pricePerHour: 0 }).expect(403);
    await request(app.getHttpServer()).put('/areas/1').set('Authorization', auth(role))
      .send({ pricePerHour: 0 }).expect(403);
  });

  it.each(['admin', 'manager'])('%s 可维护区域费率和系统设置，区域仍公开可读', async role => {
    const area = await request(app.getHttpServer()).post('/areas').set('Authorization', auth(role))
      .send({ name: '测试区域', pricePerHour: 10 }).expect(201);
    await request(app.getHttpServer()).put(`/areas/${area.body.id}`).set('Authorization', auth(role))
      .send({ pricePerHour: 12 }).expect(200);
    const publicAreas = await request(app.getHttpServer()).get('/areas').expect(200);
    expect(Number(publicAreas.body[0].pricePerHour)).toBe(12);
    await request(app.getHttpServer()).put('/settings').set('Authorization', auth(role))
      .send({ shopName: '测试门店' }).expect(200);
  });

  it.each([{ amount: -1 }, { amount: 0 }, { amount: 1.001 }, { amount: '10' },
    { userId: '1' }, { paymentMethod: 'unknown' }, { operatorId: 999 }])('非法充值不改变账户或流水 %j', async extra => {
    await request(app.getHttpServer()).post('/billing/recharge').set('Authorization', auth('cashier'))
      .send({ requestId: randomUUID(), userId, amount: 10, paymentMethod: 'cash', ...extra }).expect(400);
    expect(Number((await account()).balance)).toBe(30);
    expect(await source.getRepository(Transaction).count()).toBe(0);
  });

  async function seedBilling(withSessions = true) {
    const other = await source.getRepository(User).save({ nickname: '另一会员', balance: 100 });
    const area = await source.getRepository(Area).save({ name: '计费区', pricePerHour: 60, status: 'active' });
    await source.getRepository(Machine).save(['B-01', 'B-02', 'B-03'].map(id => ({ id, areaId: area.id, status: 'offline' })));
    const service = app.get(BillingService);
    const own = withSessions ? await service.startSession(userId, 'B-01') : undefined;
    const foreign = withSessions ? await service.startSession(other.id, 'B-02') : undefined;
    if (own) await source.getRepository(Session).update(own.id, { startTime: new Date(Date.now() - 61000) });
    if (foreign) await source.getRepository(Session).update(foreign.id, { startTime: new Date(Date.now() - 61000) });
    return { otherId: other.id, ownId: own?.id, foreignId: foreign?.id };
  }

  it.each(['cleaner', 'technician', 'owner', undefined])('%s 不能读取或操作计费会话及流水', async role => {
    const { otherId, foreignId } = await seedBilling();
    for (const path of ['/billing/sessions', '/billing/history', '/billing/transactions']) {
      await request(app.getHttpServer()).get(path).set('Authorization', auth(role)).expect(403);
    }
    await request(app.getHttpServer()).post('/billing/sessions').set('Authorization', auth(role))
      .send({ userId: otherId, machineId: 'B-03' }).expect(403);
    for (const action of ['pause', 'resume', 'end']) {
      await request(app.getHttpServer()).patch(`/billing/sessions/${foreignId}/${action}`)
        .set('Authorization', auth(role)).expect(403);
    }
    expect(await source.getRepository(Session).count()).toBe(2);
    expect((await source.getRepository(Session).findOneByOrFail({ id: foreignId })).status).toBe('active');
    expect(Number((await account()).balance)).toBe(30);
    expect(await source.getRepository(Transaction).count()).toBe(0);
  });

  it('顾客不能用查询参数读取其他会员的会话、历史或流水', async () => {
    const { otherId, ownId } = await seedBilling();
    await source.getRepository(Transaction).save([
      { userId, type: 'recharge', amount: 30, balanceAfter: 30 },
      { userId: otherId, type: 'recharge', amount: 100, balanceAfter: 100 },
    ]);
    for (const path of ['/billing/sessions', '/billing/history', '/billing/transactions']) {
      const response = await request(app.getHttpServer()).get(path).query({ userId: otherId })
        .set('Authorization', auth('customer')).expect(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].userId).toBe(userId);
      if (path !== '/billing/transactions') expect(response.body[0].id).toBe(ownId);
    }
  });

  it('顾客不能替他人上机、暂停、恢复或结算', async () => {
    const { otherId, foreignId } = await seedBilling();
    await request(app.getHttpServer()).post('/billing/sessions').set('Authorization', auth('customer'))
      .send({ userId: otherId, machineId: 'B-03' }).expect(403);
    for (const action of ['pause', 'resume', 'end']) {
      await request(app.getHttpServer()).patch(`/billing/sessions/${foreignId}/${action}`)
        .set('Authorization', auth('customer')).expect(403);
    }
    expect((await source.getRepository(Session).findOneByOrFail({ id: foreignId })).status).toBe('active');
    expect(await source.getRepository(Transaction).count()).toBe(0);
  });

  it('顾客仍可完成本人上机、暂停、恢复和重复结算流程', async () => {
    await seedBilling(false);
    const started = await request(app.getHttpServer()).post('/billing/sessions').set('Authorization', auth('customer'))
      .send({ userId, machineId: 'B-01' }).expect(201);
    const id = started.body.id;
    await source.getRepository(Session).update(id, { startTime: new Date(Date.now() - 61000) });
    await request(app.getHttpServer()).patch(`/billing/sessions/${id}/pause`).set('Authorization', auth('customer')).expect(200);
    await request(app.getHttpServer()).patch(`/billing/sessions/${id}/resume`).set('Authorization', auth('customer')).expect(200);
    const ended = await request(app.getHttpServer()).patch(`/billing/sessions/${id}/end`)
      .set('Authorization', auth('customer')).expect(200);
    const repeated = await request(app.getHttpServer()).patch(`/billing/sessions/${id}/end`)
      .set('Authorization', auth('customer')).expect(200);
    expect(repeated.body.amount).toBe(ended.body.amount);
    expect(ended.body.status).toBe('completed');
    expect(Number((await account()).balance)).toBeCloseTo(30 - Number(ended.body.amount), 2);
    expect(await source.getRepository(Transaction).count()).toBe(1);
    expect(await source.getRepository(CleaningTask).count()).toBe(1);
    expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-01' })).status).toBe('dirty');
  });

  it.each(['admin', 'manager', 'cashier'])('%s 可以管理跨会员会话，查询历史必须明确会员ID', async role => {
    const { otherId, foreignId } = await seedBilling();
    const sessions = await request(app.getHttpServer()).get('/billing/sessions').set('Authorization', auth(role)).expect(200);
    expect(sessions.body).toHaveLength(2);
    await request(app.getHttpServer()).get('/billing/history').set('Authorization', auth(role)).expect(400);
    const history = await request(app.getHttpServer()).get('/billing/history').query({ userId: otherId })
      .set('Authorization', auth(role)).expect(200);
    expect(history.body.map((row: Session) => row.userId)).toEqual([otherId]);
    await request(app.getHttpServer()).patch(`/billing/sessions/${foreignId}/pause`).set('Authorization', auth(role)).expect(200);
    await request(app.getHttpServer()).patch(`/billing/sessions/${foreignId}/resume`).set('Authorization', auth(role)).expect(200);
    await request(app.getHttpServer()).patch(`/billing/sessions/${foreignId}/end`).set('Authorization', auth(role)).expect(200);
    const transactions = await request(app.getHttpServer()).get('/billing/transactions').query({ userId: otherId, type: 'consume' })
      .set('Authorization', auth(role)).expect(200);
    expect(transactions.body).toHaveLength(1);
    expect(transactions.body[0].userId).toBe(otherId);
  });

  it.each([0, undefined, '1'])('主体ID为 %s 的顾客令牌不能退化成全量查询', async sub => {
    await seedBilling();
    const invalidAuth = `Bearer ${jwt.sign({ sub, role: 'customer' })}`;
    await request(app.getHttpServer()).get('/billing/sessions').set('Authorization', invalidAuth).expect(403);
    await request(app.getHttpServer()).get('/billing/transactions').set('Authorization', invalidAuth).expect(403);
  });

  it('服务层收到0号会员筛选时也不会回退为全量查询', async () => {
    await seedBilling();
    const service = app.get(BillingService);
    await source.getRepository(Transaction).save({ userId, type: 'recharge', amount: 30, balanceAfter: 30 });
    expect(await service.getActiveSessions(0)).toEqual([]);
    expect(await service.getTransactions(0)).toEqual([]);
  });

  it.each([{ userId: '1' }, { userId: 0 }, { machineId: '' }, { machineId: '   ' },
    { machineId: 'x'.repeat(21) }, { amount: 0 }])('非法上机请求不创建会话 %j', async extra => {
    await seedBilling(false);
    await request(app.getHttpServer()).post('/billing/sessions').set('Authorization', auth('cashier'))
      .send({ userId, machineId: 'B-01', ...extra }).expect(400);
    expect(await source.getRepository(Session).count()).toBe(0);
    expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-01' })).status).toBe('offline');
  });

  it.each([{ userId: 0 }, { userId: -1 }, { userId: 'abc' }, { userId: [1, 2] }, { type: 'unknown' }])
    ('非法交易筛选被拒绝 %j', async query => {
      await request(app.getHttpServer()).get('/billing/transactions').query(query)
        .set('Authorization', auth('cashier')).expect(400);
    });

  async function seedFaultType() {
    await source.getRepository(FaultType).save({
      id: 'headset', name: '耳机故障', category: 'peripheral', defaultPriority: 'P2', timeoutMinutes: 10,
    });
  }

  async function seedFaults() {
    const billing = await seedBilling();
    await seedFaultType();
    const own = await request(app.getHttpServer()).post('/faults/tickets').set('Authorization', auth('customer'))
      .send({ machineId: 'B-01', faultType: 'headset', playerAction: 'change' }).expect(201);
    const otherToken = jwt.sign({ sub: billing.otherId, role: 'customer' });
    const foreign = await request(app.getHttpServer()).post('/faults/tickets').set('Authorization', `Bearer ${otherToken}`)
      .send({ machineId: 'B-02', faultType: 'headset' }).expect(201);
    return { ...billing, ownTicketId: own.body.id as string, foreignTicketId: foreign.body.id as string };
  }

  async function seedCleaning() {
    await seedBilling(false);
    await source.getRepository(Machine).update('B-01', { status: 'dirty' });
    return source.getRepository(CleaningTask).save({ machineId: 'B-01', status: 'pending', createdAt: new Date() });
  }

  async function secondStaff(role: string) {
    await source.getRepository(Staff).save({ id: 6, username: `${role}-2`, name: '另一员工', role, password: 'unused-in-token-tests' });
    return `Bearer ${jwt.sign({ sub: 6, role })}`;
  }

  it.each(['customer', 'cashier', 'cleaner'])('%s 不能接单或标记维修完成', async role => {
    const { ownTicketId } = await seedFaults();
    await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/accept`).set('Authorization', auth(role)).expect(403);
    await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/resolve`).set('Authorization', auth(role))
      .send({ resolution: '已修复' }).expect(403);
    expect((await source.getRepository(FaultTicket).findOneByOrFail({ id: ownTicketId })).status).toBe('pending');
  });

  it.each(['cleaner', 'owner', undefined])('%s 不能读取工单和报修者信息', async role => {
    const { ownTicketId } = await seedFaults();
    await request(app.getHttpServer()).get('/faults/tickets').set('Authorization', auth(role)).expect(403);
    await request(app.getHttpServer()).get(`/faults/tickets/${ownTicketId}`).set('Authorization', auth(role)).expect(403);
  });

  it('顾客只看到本人玩家工单，即使员工报修ID与本人相同也不泄露', async () => {
    const { ownTicketId, foreignTicketId } = await seedFaults();
    await source.getRepository(FaultTicket).save({ id: 'STAFF-REPORT', machineId: 'B-01', faultType: 'headset',
      faultCategory: 'peripheral', source: 'staff_report', reporterType: 'staff', reporterId: userId, priority: 'P2', status: 'resolved' });
    const list = await request(app.getHttpServer()).get('/faults/tickets').set('Authorization', auth('customer')).expect(200);
    expect(list.body.map((row: FaultTicket) => row.id)).toEqual([ownTicketId]);
    await request(app.getHttpServer()).get(`/faults/tickets/${foreignTicketId}`).set('Authorization', auth('customer')).expect(403);
    await request(app.getHttpServer()).get(`/faults/tickets/${ownTicketId}`).set('Authorization', auth('customer')).expect(200);
    expect(await app.get(FaultService).findAll(undefined, undefined, 0)).toEqual([]);
  });

  it.each(['handlerId', 'reporterId', 'reporterType', 'source', 'status', 'priority', 'resolvedBy'])
    ('报修不允许客户端指定 %s', async field => {
      await seedBilling();
      await seedFaultType();
      const result = await request(app.getHttpServer()).post('/faults/tickets').set('Authorization', auth('customer'))
        .send({ machineId: 'B-01', faultType: 'headset', [field]: 'injected' }).expect(400);
      expect(result.body.message).toContain(`property ${field} should not exist`);
      expect(await source.getRepository(FaultTicket).count()).toBe(0);
    });

  it('接单不接受伪造处理人，成功接单返回真实技师ID', async () => {
    const { ownTicketId } = await seedFaults();
    await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/accept`).set('Authorization', auth('technician'))
      .send({ handlerId: 999 }).expect(400);
    const accepted = await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/accept`)
      .set('Authorization', auth('technician')).expect(200);
    expect(accepted.body.handlerId).toBe(actorId('technician'));
  });

  it('技师只能处理本人已接工单，换机和维修保留真实操作员与原计费', async () => {
    const { ownTicketId, ownId } = await seedFaults();
    await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/accept`).set('Authorization', auth('technician')).expect(200);
    const another = await secondStaff('technician');
    await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/resolve`).set('Authorization', another)
      .send({ resolution: '越权修复' }).expect(403);
    await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/transfer`).set('Authorization', another)
      .send({ newMachineId: 'B-03' }).expect(403);
    expect((await source.getRepository(Session).findOneByOrFail({ id: ownId })).machineId).toBe('B-01');
    const transferred = await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/transfer`)
      .set('Authorization', auth('technician')).send({ newMachineId: 'B-03' }).expect(200);
    expect(transferred.body.status).toBe('accepted');
    expect(transferred.body.transferredBy).toBe(actorId('technician'));
    const session = await source.getRepository(Session).findOneByOrFail({ id: ownId });
    expect(session.machineId).toBe('B-03');
    expect(Number(session.hourlyRate)).toBe(60);
    const resolved = await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/resolve`)
      .set('Authorization', auth('technician')).send({ resolution: '更换耳机' }).expect(200);
    expect(resolved.body.resolvedBy).toBe(actorId('technician'));
    expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-01' })).status).toBe('dirty');
    expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-03' })).status).toBe('online');
    expect(await source.getRepository(CleaningTask).count()).toBe(1);
  });

  it.each(['admin', 'manager'])('%s 可协调完成其他技师工单，同时保留原处理人', async role => {
    const { ownTicketId } = await seedFaults();
    await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/accept`).set('Authorization', auth('technician')).expect(200);
    const result = await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/resolve`)
      .set('Authorization', auth(role)).send({ resolution: '管理协调完成' }).expect(200);
    expect(result.body.handlerId).toBe(actorId('technician'));
    expect(result.body.resolvedBy).toBe(actorId(role));
    expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-01' })).status).toBe('online');
  });

  it.each(['admin', 'manager', 'cashier'])('%s 可在接单后协调换机并记录实际操作员', async role => {
    const { ownTicketId } = await seedFaults();
    await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/accept`).set('Authorization', auth('technician')).expect(200);
    const result = await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/transfer`)
      .set('Authorization', auth(role)).send({ newMachineId: 'B-03' }).expect(200);
    expect(result.body.transferredBy).toBe(actorId(role));
    expect(result.body.handlerId).toBe(actorId('technician'));
    expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-01' })).status).toBe('fault');
  });

  it.each([{ resolution: '' }, { resolution: null }, { resolution: ' ' }, { resolution: 'x'.repeat(51) },
    { resolution: '已修复', resolvedBy: 999 }, { resolution: '已修复', note: {} }])('非法修复请求不改变工单 %j', async data => {
    const { ownTicketId } = await seedFaults();
    await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/accept`).set('Authorization', auth('technician')).expect(200);
    await request(app.getHttpServer()).patch(`/faults/tickets/${ownTicketId}/resolve`)
      .set('Authorization', auth('technician')).send(data).expect(400);
    const saved = await source.getRepository(FaultTicket).findOneByOrFail({ id: ownTicketId });
    expect(saved.status).toBe('accepted');
    expect(saved.resolvedBy).toBeNull();
  });

  it.each([{ reporterId: 2 }, { status: 'unknown' }, { priority: 'P9' }])('非法工单查询被拒绝 %j', async query => {
    await request(app.getHttpServer()).get('/faults/tickets').query(query).set('Authorization', auth('customer')).expect(400);
  });

  it.each(['customer', 'technician', 'owner', undefined])('%s 不能读取或操作保洁任务', async role => {
    const task = await seedCleaning();
    await request(app.getHttpServer()).get('/cleaning/tasks/pending').set('Authorization', auth(role)).expect(403);
    await request(app.getHttpServer()).get('/cleaning/tasks/completed').set('Authorization', auth(role)).expect(403);
    for (const action of ['start', 'complete']) {
      await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/${action}`).set('Authorization', auth(role)).expect(403);
    }
    expect((await source.getRepository(CleaningTask).findOneByOrFail({ id: task.id })).status).toBe('pending');
  });

  it('收银可查看保洁进度，但不能开始或确认完成', async () => {
    const task = await seedCleaning();
    await request(app.getHttpServer()).get('/cleaning/tasks/pending').set('Authorization', auth('cashier')).expect(200);
    for (const action of ['start', 'complete']) {
      await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/${action}`).set('Authorization', auth('cashier')).expect(403);
    }
  });

  it('保洁操作不接受伪造执行人或完成者', async () => {
    const task = await seedCleaning();
    await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/start`).set('Authorization', auth('cleaner'))
      .send({ cleanerId: 999 }).expect(400);
    const started = await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/start`)
      .set('Authorization', auth('cleaner')).expect(201);
    expect(started.body.cleanerId).toBe(actorId('cleaner'));
    await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/complete`).set('Authorization', auth('cleaner'))
      .send({ completedBy: 999 }).expect(400);
    expect((await source.getRepository(CleaningTask).findOneByOrFail({ id: task.id })).status).toBe('in_progress');
  });

  it('保洁只能完成本人的任务，重复确认保持原完成者和时间', async () => {
    const task = await seedCleaning();
    await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/start`).set('Authorization', auth('cleaner')).expect(201);
    const another = await secondStaff('cleaner');
    await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/complete`).set('Authorization', another).expect(403);
    const completed = await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/complete`)
      .set('Authorization', auth('cleaner')).expect(201);
    const repeat = await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/complete`)
      .set('Authorization', auth('cleaner')).expect(201);
    expect(completed.body.cleanerId).toBe(actorId('cleaner'));
    expect(completed.body.completedBy).toBe(actorId('cleaner'));
    expect(repeat.body.completedAt).toBe(completed.body.completedAt);
    expect(repeat.body.completedBy).toBe(completed.body.completedBy);
    await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/complete`).set('Authorization', another).expect(403);
    expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-01' })).status).toBe('offline');
  });

  it.each(['admin', 'manager'])('%s 可协调完成保洁，记录完成者并保留原执行人', async role => {
    const task = await seedCleaning();
    await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/start`).set('Authorization', auth('cleaner')).expect(201);
    const completed = await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/complete`)
      .set('Authorization', auth(role)).expect(201);
    expect(completed.body.cleanerId).toBe(actorId('cleaner'));
    expect(completed.body.completedBy).toBe(actorId(role));
    const repeat = await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/complete`)
      .set('Authorization', auth('cleaner')).expect(201);
    expect(repeat.body.completedBy).toBe(actorId(role));
  });

  it('保洁必须先开始，任务ID必须是整数', async () => {
    const task = await seedCleaning();
    await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/complete`).set('Authorization', auth('cleaner')).expect(400);
    await request(app.getHttpServer()).post('/cleaning/tasks/not-a-number/start').set('Authorization', auth('cleaner')).expect(400);
  });

  it('重复确认旧保洁任务不会把新上机会话广播为空闲', async () => {
    const task = await seedCleaning();
    await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/start`).set('Authorization', auth('cleaner')).expect(201);
    await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/complete`).set('Authorization', auth('cleaner')).expect(201);
    const session = await app.get(BillingService).startSession(userId, 'B-01');
    const gateway = app.get(EventsGateway);
    (gateway.broadcastMachineUpdate as jest.Mock).mockClear();
    await request(app.getHttpServer()).post(`/cleaning/tasks/${task.id}/complete`).set('Authorization', auth('cleaner')).expect(201);
    expect(gateway.broadcastMachineUpdate).not.toHaveBeenCalled();
    const machine = await source.getRepository(Machine).findOneByOrFail({ id: 'B-01' });
    expect(machine.status).toBe('online');
    expect(machine.sessionId).toBe(session.id);
  });

  it.each(['customer', 'cleaner', 'technician', 'owner', undefined])('%s 不能读取财务统计或交接班', async role => {
    for (const path of ['/analytics/overview', '/analytics/machines', '/analytics/areas', '/analytics/hourly', '/analytics/faults', '/shifts']) {
      await request(app.getHttpServer()).get(path).set('Authorization', auth(role)).expect(403);
    }
    await request(app.getHttpServer()).post('/shifts').set('Authorization', auth(role)).send({}).expect(403);
  });

  it.each(['admin', 'manager', 'cashier'])('%s 可查看财务与交班，交班人取自登录身份', async role => {
    await request(app.getHttpServer()).get('/analytics/overview').set('Authorization', auth(role)).expect(200);
    await request(app.getHttpServer()).get('/shifts').set('Authorization', auth(role)).expect(200);
    const response = await request(app.getHttpServer()).post('/shifts').set('Authorization', auth(role))
      .send({ outgoingStaffId: 999, incomingStaffId: 3, shiftType: 'morning', actualCash: 10, expectedCash: 10 }).expect(201);
    expect(response.body.outgoingStaffId).toBe(actorId(role));
  });

  it.each(['cleaner', 'technician', 'owner', undefined])('%s 不能访问或履约水吧订单', async role => {
    await request(app.getHttpServer()).get('/orders').set('Authorization', auth(role)).expect(403);
    await request(app.getHttpServer()).post('/orders').set('Authorization', auth(role)).send({}).expect(403);
    await request(app.getHttpServer()).patch('/orders/1/status').set('Authorization', auth(role))
      .send({ status: 'completed' }).expect(403);
  });

  it('顾客订单按本人隔离，收银可以履约和退款，重复退款不重复入账', async () => {
    const { otherId } = await seedBilling();
    const own = await request(app.getHttpServer()).post('/orders').set('Authorization', auth('customer'))
      .send({ requestId: randomUUID(), userId: otherId, items: [{ itemId: 4, qty: 1 }] }).expect(201);
    expect(own.body.userId).toBe(userId);
    expect(Number(own.body.total)).toBe(12);
    await source.getRepository(Order).save({ userId: otherId, machineId: 'B-02', items: '[]', total: 5, status: 'pending' });
    const mine = await request(app.getHttpServer()).get('/orders').set('Authorization', auth('customer')).expect(200);
    expect(mine.body.map((row: Order) => row.userId)).toEqual([userId]);
    await request(app.getHttpServer()).patch(`/orders/${own.body.id}/status`).set('Authorization', auth('customer'))
      .send({ status: 'cancelled' }).expect(403);
    await request(app.getHttpServer()).patch(`/orders/${own.body.id}/status`).set('Authorization', auth('cashier'))
      .send({ status: 'preparing' }).expect(200);
    for (let repeat = 0; repeat < 2; repeat++) {
      await request(app.getHttpServer()).patch(`/orders/${own.body.id}/status`).set('Authorization', auth('cashier'))
        .send({ status: 'cancelled' }).expect(200);
    }
    expect(Number((await account()).balance)).toBe(30);
    expect(await source.getRepository(Transaction).count({ where: { type: 'refund' } })).toBe(1);
  });

  it.each(['customer', 'cashier', 'cleaner', 'owner'])('%s 不能直接改座位状态', async role => {
    await seedBilling(false);
    await request(app.getHttpServer()).patch('/machines/B-03/status').set('Authorization', auth(role))
      .send({ status: 'maintenance' }).expect(403);
    expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-03' })).status).toBe('offline');
  });

  it.each(['admin', 'manager', 'technician'])('%s 可将空闲座位设为维护', async role => {
    await seedBilling(false);
    await request(app.getHttpServer()).patch('/machines/B-03/status').set('Authorization', auth(role))
      .send({ status: 'maintenance' }).expect(200);
  });

  it.each([undefined, 0, '1', {}])('员工下单的无效会员ID %j 不会退化为扣款首个会员', async invalidId => {
    await seedBilling();
    await request(app.getHttpServer()).post('/orders').set('Authorization', auth('cashier'))
      .send({ requestId: randomUUID(), userId: invalidId, items: [{ itemId: 4, qty: 1 }] }).expect(400);
    expect(await source.getRepository(Order).count()).toBe(0);
    expect(Number((await account()).balance)).toBe(30);
  });
});
