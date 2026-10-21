import { INestApplication, ValidationPipe } from '@nestjs/common';
import request = require('supertest');
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
// Reuse the installed workspace client without downloading another copy.
import { io, Socket as ClientSocket } from '../../frontend/node_modules/socket.io-client';
import { EventsModule } from '../src/common/gateway/events.module';
import { EventsGateway } from '../src/common/gateway/events.gateway';
import { Staff } from '../src/modules/user/staff.entity';
import { User } from '../src/modules/user/user.entity';
import { FaultTicket } from '../src/modules/fault/fault-ticket.entity';
import { Machine } from '../src/modules/machine/machine.entity';
import { Area } from '../src/modules/area/area.entity';
import { AuthModule } from '../src/modules/auth/auth.module';
import { FaultModule } from '../src/modules/fault/fault.module';
import { FaultType } from '../src/modules/fault/fault-type.entity';
import { Session } from '../src/modules/billing/session.entity';
import { CleaningTask } from '../src/modules/cleaning/cleaning-task.entity';

describe('真实Socket握手、订阅与发送隔离（独立内存库）', () => {
  let app: INestApplication;
  let source: DataSource;
  let gateway: EventsGateway;
  let url: string;
  const clients: ClientSocket[] = [];
  const secret = 'isolated-socket-test-secret';
  const jwt = new JwtService({ secret });
  const roles = ['admin', 'manager', 'cashier', 'technician', 'cleaner'];
  const actorId = (role: string) => role === 'customer' ? 1 : roles.indexOf(role) + 1;
  const token = (role: string, sub = actorId(role)) => jwt.sign({ sub, role }, { expiresIn: '1h' });

  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [
      ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
      TypeOrmModule.forRoot({ type: 'better-sqlite3', database: ':memory:', autoLoadEntities: true,
        entities: [Staff, User, FaultTicket, Machine, Area, Session, CleaningTask], synchronize: true }), EventsModule, AuthModule, FaultModule,
    ] }).overrideProvider(ConfigService).useValue(new ConfigService({ JWT_SECRET: secret })).compile();
    app = module.createNestApplication();
    app.useLogger(false);
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.listen(0, '127.0.0.1');
    url = await app.getUrl();
    source = app.get(DataSource);
    gateway = app.get(EventsGateway);
  });
  beforeEach(async () => {
    await source.synchronize(true);
    await source.getRepository(Staff).save(roles.map(role => ({ id: actorId(role), role, username: role, name: role, password: 'unused' })));
    await source.getRepository(User).save([{ id: 1, nickname: '本人', balance: 30 }, { id: 2, nickname: '其他会员', balance: 30 }]);
    await source.getRepository(Area).save({ id: 1, name: '测试区', pricePerHour: 10 });
    await source.getRepository(Machine).save({ id: 'B-01', areaId: 1, status: 'offline' });
  });
  afterEach(() => {
    gateway?.server.disconnectSockets(true);
    for (const client of clients.splice(0)) { client.removeAllListeners(); client.disconnect(); }
  });
  afterAll(async () => { await app?.close(); });

  function open(authToken: unknown): Promise<ClientSocket> {
    const client = io(url, { auth: { token: authToken }, transports: ['websocket'], reconnection: false, autoConnect: false });
    clients.push(client);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('connection timeout')), 3000);
      client.once('connect', () => { clearTimeout(timer); resolve(client); });
      client.once('connect_error', error => { clearTimeout(timer); reject(error); });
      client.connect();
    });
  }
  const ack = (client: ClientSocket, event: string, data: unknown = {}) => new Promise<any>((resolve, reject) => {
    client.timeout(2000).emit(event, data, (error: Error | null, response: unknown) => error ? reject(error) : resolve(response));
  });
  // Per-connection heartbeat acknowledgements form an ordering barrier, without sleeps.
  const barrier = (sockets: ClientSocket[]) => Promise.all(sockets.map(client => ack(client, 'heartbeat')));
  async function ticket(id = 'T-1', reporterId = 1, reporterType = 'player') {
    await source.getRepository(FaultTicket).save({ id, machineId: 'B-01', faultType: 'mouse', faultCategory: 'peripheral',
      source: 'player_report', priority: 'P2', status: 'pending', reporterId, reporterType });
  }

  describe('真实HTTP工单生命周期通知', () => {
    async function listeners() {
      const sockets = await Promise.all(['admin', 'technician', 'cleaner', 'customer', 'customer'].map((role, index) =>
        open(token(role, index === 4 ? 2 : actorId(role)))));
      const records = sockets.map(client => {
        const record = { alerts: [] as any[], updates: [] as any[], seats: [] as any[] };
        client.on('new_alert', data => record.alerts.push(data));
        client.on('ticket_update', data => record.updates.push(data));
        client.on('machine_status_update', data => record.seats.push(data));
        return record;
      });
      await Promise.all(sockets.map(client => ack(client, 'subscribe', { topic: 'tickets' })));
      return { sockets, records };
    }
    async function seedReport() {
      await source.getRepository(FaultType).save({ id: 'headset', name: '耳机故障', category: 'peripheral', defaultPriority: 'P2', timeoutMinutes: 10 });
      await source.getRepository(Session).save({ userId: 1, machineId: 'B-01', startTime: new Date(), status: 'active' });
      await source.getRepository(Machine).update('B-01', { status: 'online', currentUserId: 1 });
    }
    const report = (role = 'customer') => request(app.getHttpServer()).post('/faults/tickets')
      .auth(token(role), { type: 'bearer' }).send({ machineId: 'B-01', faultType: 'headset', description: '左侧无声' });
    const accept = (id: string, role = 'technician') => request(app.getHttpServer()).patch(`/faults/tickets/${id}/accept`)
      .auth(token(role), { type: 'bearer' }).send({});
    const complete = (action: 'resolve' | 'transfer') => request(app.getHttpServer()).patch(`/faults/tickets/T-1/${action}`)
      .auth(token('technician'), { type: 'bearer' }).send(action === 'resolve' ? { resolution: '更换耳机', note: '测试正常' } : { newMachineId: 'B-02' });
    async function seedAccepted(withSession = true) {
      if (withSession) await seedReport();
      await ticket();
      await source.getRepository(FaultTicket).update('T-1', { status: 'accepted', handlerId: actorId('technician') });
      await source.getRepository(Machine).update('B-01', { status: 'fault' });
      await source.getRepository(Machine).save({ id: 'B-02', areaId: 1, status: 'offline' });
    }

    it('顾客报修提交后仅工单员工收到完整新告警，本人收到状态，其他会员和保洁不收到详情', async () => {
      await seedReport();
      const { sockets, records } = await listeners();
      const { body } = await report().expect(201);
      await barrier(sockets);
      expect(records.map(row => row.alerts.length)).toEqual([1, 1, 0, 0, 0]);
      expect(records.map(row => row.updates.length)).toEqual([0, 0, 0, 1, 0]);
      expect(records.map(row => row.seats.length)).toEqual([1, 1, 1, 1, 1]);
      expect(records[0].alerts[0]).toMatchObject({ id: body.id, machineId: 'B-01', status: 'pending', priority: 'P2', description: '左侧无声', reporterId: 1, reporterType: 'player' });
      expect(records[3].updates[0]).toMatchObject({ id: body.id, updates: { status: 'pending' } });
      expect((await source.getRepository(FaultTicket).findOneByOrFail({ id: body.id })).status).toBe('pending');
      await accept(body.id).expect(200);
      await barrier(sockets);
      expect(records.map(row => row.updates.length)).toEqual([1, 1, 0, 2, 0]);
      expect(records[3].updates[1]).toMatchObject({ id: body.id, updates: { status: 'accepted', handlerId: actorId('technician') } });
      expect(records.map(row => row.alerts.length)).toEqual([1, 1, 0, 0, 0]);
    });

    it('员工同编号报修不会将详情发给顾客，未订阅员工也收不到告警', async () => {
      await seedReport();
      const { sockets, records } = await listeners();
      const unsubscribed = await open(token('manager'));
      const alerts: unknown[] = [];
      unsubscribed.on('new_alert', data => alerts.push(data));
      await report('admin').expect(201);
      await barrier([...sockets, unsubscribed]);
      expect(records.map(row => row.alerts.length)).toEqual([1, 1, 0, 0, 0]);
      expect(records.map(row => row.updates.length)).toEqual([0, 0, 0, 0, 0]);
      expect(alerts).toEqual([]);
    });

    it('接单提交后同步真实操作者，重复接单不产生第二次成功事件', async () => {
      await ticket();
      const { sockets, records } = await listeners();
      await accept('T-1').expect(200);
      await accept('T-1').expect(400);
      await barrier(sockets);
      expect(records.map(row => row.updates.length)).toEqual([1, 1, 0, 1, 0]);
      expect(records[3].updates[0]).toMatchObject({ id: 'T-1', updates: { status: 'accepted', handlerId: actorId('technician'), acceptedAt: expect.any(String), updatedAt: expect.any(String) } });
      expect(records.every(row => row.alerts.length === 0)).toBe(true);
      expect((await source.getRepository(FaultTicket).findOneByOrFail({ id: 'T-1' })).handlerId).toBe(actorId('technician'));
    });

    it.each(['customer', 'cleaner', 'cashier'])('%s越权接单无更新事件和数据库副作用', async role => {
      await ticket();
      const { sockets, records } = await listeners();
      await accept('T-1', role).expect(403);
      await barrier(sockets);
      expect(records.every(row => row.updates.length === 0)).toBe(true);
      expect((await source.getRepository(FaultTicket).findOneByOrFail({ id: 'T-1' })).status).toBe('pending');
    });

    it('报修的座位更新失败时整笔回滚，不发送新告警、状态或座位成功事件', async () => {
      await seedReport();
      const { sockets, records } = await listeners();
      await source.query(`CREATE TRIGGER fail_report BEFORE UPDATE ON machines BEGIN SELECT RAISE(ABORT, 'injected report rollback'); END`);
      try { await report().expect(500); } finally { await source.query('DROP TRIGGER fail_report'); }
      await barrier(sockets);
      expect(records.every(row => row.alerts.length + row.updates.length + row.seats.length === 0)).toBe(true);
      expect(await source.getRepository(FaultTicket).count()).toBe(0);
      expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-01' })).status).toBe('online');
    });

    it('接单写库失败不发状态，恢复后重试只发送一次', async () => {
      await ticket();
      const { sockets, records } = await listeners();
      await source.query(`CREATE TRIGGER fail_accept BEFORE UPDATE ON fault_tickets BEGIN SELECT RAISE(ABORT, 'injected accept rollback'); END`);
      try { await accept('T-1').expect(500); } finally { await source.query('DROP TRIGGER fail_accept'); }
      await barrier(sockets);
      expect(records.every(row => row.updates.length === 0)).toBe(true);
      expect((await source.getRepository(FaultTicket).findOneByOrFail({ id: 'T-1' })).status).toBe('pending');
      await accept('T-1').expect(200);
      await barrier(sockets);
      expect(records.map(row => row.updates.length)).toEqual([1, 1, 0, 1, 0]);
    });

    it('推送传输失败不会把已提交报修变成HTTP失败，列表快照仍能恢复', async () => {
      await seedReport();
      const transport = jest.spyOn(gateway.server, 'in').mockImplementation(() => { throw new Error('injected delivery failure'); });
      let id: string;
      try { id = (await report().expect(201)).body.id; } finally { transport.mockRestore(); }
      expect((await source.getRepository(FaultTicket).findOneByOrFail({ id: id! })).status).toBe('pending');
      const response = await request(app.getHttpServer()).get('/faults/tickets').auth(token('admin'), { type: 'bearer' }).expect(200);
      expect(response.body.map((row: FaultTicket) => row.id)).toEqual([id!]);
    });

    it.each([true, false])('维修完成通知同步真实操作者，在场=%s时座位与保洁状态正确', async withSession => {
      await seedAccepted(withSession);
      const { sockets, records } = await listeners();
      await complete('resolve').expect(200);
      await complete('resolve').expect(400);
      await barrier(sockets);
      expect(records.map(row => row.updates.length)).toEqual([1, 1, 0, 1, 0]);
      expect(records[3].updates[0]).toMatchObject({ id: 'T-1', updates: {
        status: 'resolved', resolution: '更换耳机', resolutionNote: '测试正常', resolvedBy: actorId('technician'), resolvedAt: expect.any(String), updatedAt: expect.any(String),
      } });
      const status = withSession ? 'online' : 'dirty';
      expect(records.every(row => row.alerts.length === 0 && row.seats.length === 1 && row.seats[0].status === status)).toBe(true);
      expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-01' })).status).toBe(status);
      expect(await source.getRepository(CleaningTask).count()).toBe(withSession ? 0 : 1);
    });

    it('换机后发布两座位和本人工单更新，原工单继续维修，随后完成原机维修', async () => {
      await seedAccepted();
      const { sockets, records } = await listeners();
      await complete('transfer').expect(200);
      await barrier(sockets);
      expect(records.map(row => row.updates.length)).toEqual([1, 1, 0, 1, 0]);
      expect(records[3].updates[0]).toMatchObject({ id: 'T-1', updates: {
        status: 'accepted', newMachineId: 'B-02', playerAction: 'transferred', transferredBy: actorId('technician'), transferredAt: expect.any(String), updatedAt: expect.any(String),
      } });
      expect(records.every(row => row.alerts.length === 0 && row.seats.length === 2)).toBe(true);
      expect(records[0].seats.map(row => [row.machine_id, row.status])).toEqual([['B-01', 'fault'], ['B-02', 'online']]);
      expect((await source.getRepository(Session).findOneByOrFail({ userId: 1 })).machineId).toBe('B-02');
      await complete('resolve').expect(200);
      await barrier(sockets);
      expect(records.map(row => row.updates.length)).toEqual([2, 2, 0, 2, 0]);
      expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-01' })).status).toBe('dirty');
      expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-02' })).status).toBe('online');
      expect(await source.getRepository(CleaningTask).countBy({ machineId: 'B-01' })).toBe(1);
    });

    it.each(['resolve', 'transfer'] as const)('%s拒绝处理其他技师的工单，不发送事件', async action => {
      await seedAccepted();
      await source.getRepository(Staff).save({ id: 9, role: 'technician', username: 'other-tech', name: '其他技师', password: 'unused' });
      await source.getRepository(FaultTicket).update('T-1', { handlerId: 9 });
      const { sockets, records } = await listeners();
      await complete(action).expect(403);
      await barrier(sockets);
      expect(records.every(row => row.updates.length + row.seats.length + row.alerts.length === 0)).toBe(true);
      expect((await source.getRepository(FaultTicket).findOneByOrFail({ id: 'T-1' })).status).toBe('accepted');
      expect((await source.getRepository(Session).findOneByOrFail({ userId: 1 })).machineId).toBe('B-01');
    });

    it.each(['resolve', 'transfer'] as const)('%s事务后段失败时工单、座位、会话一起回滚且不发送成功事件', async action => {
      await seedAccepted(action === 'transfer');
      const { sockets, records } = await listeners();
      const table = action === 'resolve' ? 'cleaning_tasks' : 'fault_tickets';
      const operation = action === 'resolve' ? 'INSERT' : 'UPDATE';
      await source.query(`CREATE TRIGGER fail_completion BEFORE ${operation} ON ${table} BEGIN SELECT RAISE(ABORT, 'injected completion rollback'); END`);
      try { await complete(action).expect(500); } finally { await source.query('DROP TRIGGER fail_completion'); }
      await barrier(sockets);
      expect(records.every(row => row.updates.length + row.seats.length + row.alerts.length === 0)).toBe(true);
      const row = await source.getRepository(FaultTicket).findOneByOrFail({ id: 'T-1' });
      expect(row).toMatchObject({ status: 'accepted', newMachineId: null, resolvedAt: null, transferredAt: null });
      expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-01' })).status).toBe('fault');
      expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-02' })).status).toBe('offline');
      expect(await source.getRepository(CleaningTask).count()).toBe(0);
      if (action === 'transfer') expect((await source.getRepository(Session).findOneByOrFail({ userId: 1 })).machineId).toBe('B-01');
    });

    it('欠费待结算会话换机仍被拒绝，不发送成功事件或移动会话', async () => {
      await seedAccepted();
      await source.getRepository(Session).update({ userId: 1 }, { status: 'paused', settlementRequestedAt: new Date(), amount: 50 });
      const { sockets, records } = await listeners();
      await complete('transfer').expect(400);
      await barrier(sockets);
      expect(records.every(row => row.updates.length + row.seats.length + row.alerts.length === 0)).toBe(true);
      expect((await source.getRepository(Session).findOneByOrFail({ userId: 1 })).machineId).toBe('B-01');
    });

    it.each(['resolve', 'transfer'] as const)('%s推送失败仍返回成功并能从HTTP读取已提交结果', async action => {
      await seedAccepted();
      const transport = jest.spyOn(gateway.server, 'in').mockImplementation(() => { throw new Error('injected completion delivery failure'); });
      try { await complete(action).expect(200); } finally { transport.mockRestore(); }
      const { body } = await request(app.getHttpServer()).get('/faults/tickets/T-1').auth(token('customer'), { type: 'bearer' }).expect(200);
      expect(body.status).toBe(action === 'resolve' ? 'resolved' : 'accepted');
      if (action === 'transfer') expect(body.newMachineId).toBe('B-02');
    });
  });

  it.each(['missing', 'invalid', 'signature', 'expired', 'no-expiry', 'role', 'sub', 'missing-user', 'staff-role', 'disabled-user'])
    ('%s身份不能握手，不会收到业务事件', async kind => {
      let signed: unknown;
      if (kind === 'invalid') signed = 'not-a-jwt';
      if (kind === 'signature') signed = new JwtService({ secret: 'wrong' }).sign({ sub: 1, role: 'customer' }, { expiresIn: '1h' });
      if (kind === 'expired') signed = jwt.sign({ sub: 1, role: 'customer' }, { expiresIn: -1 });
      if (kind === 'no-expiry') signed = jwt.sign({ sub: 1, role: 'customer' });
      if (kind === 'role') signed = token('owner', 1);
      if (kind === 'sub') signed = jwt.sign({ sub: '1', role: 'customer' }, { expiresIn: '1h' });
      if (kind === 'missing-user') signed = token('customer', 999);
      if (kind === 'staff-role') signed = token('manager', 1);
      if (kind === 'disabled-user') { await source.getRepository(User).update(1, { isActive: false }); signed = token('customer'); }
      await expect(open(signed)).rejects.toThrow('UNAUTHORIZED');
      expect(gateway.server.sockets.sockets.size).toBe(0);
    });

  it.each([...roles, 'customer'])('%s订阅范围由服务端身份决定', async role => {
    const client = await open(token(role));
    for (const topic of ['machines', 'tickets', 'orders', 'notifications']) {
      const expected = topic === 'machines' ||
        (topic === 'tickets' && role !== 'cleaner') ||
        (topic === 'orders' && ['admin', 'manager', 'cashier', 'customer'].includes(role)) ||
        (topic === 'notifications' && ['admin', 'manager'].includes(role));
      expect((await ack(client, 'subscribe', { topic })).ok).toBe(expected);
    }
    const rooms = [...gateway.server.sockets.sockets.get(client.id!)!.rooms];
    if (role === 'customer') {
      expect(rooms).toContain('customer:1:tickets');
      expect(rooms).toContain('customer:1:orders');
      expect(rooms.some(room => room.startsWith('staff:') || room.startsWith('customer:2:'))).toBe(false);
    }
  });

  it.each([null, [], { topic: 'staff:tickets' }, { topic: 'tickets', userId: 2 }, { room: 'customer:2:tickets' }])
    ('非法订阅%j不能指定任意房间', async data => {
      const client = await open(token('customer'));
      expect(await ack(client, 'subscribe', data)).toEqual({ ok: false, error: 'INVALID_SUBSCRIPTION' });
      client.emit('join', 'staff:tickets');
      await barrier([client]);
      expect([...gateway.server.sockets.sockets.get(client.id!)!.rooms].sort()).toEqual([client.id!, 'machines'].sort());
    });

  it('座位仅推送已鉴权连接，工单只推送订阅员工与本人，通知仅管理岗', async () => {
    await ticket();
    const [admin, tech, cleaner, own, foreign] = await Promise.all([
      open(token('admin')), open(token('technician')), open(token('cleaner')), open(token('customer')), open(token('customer', 2)),
    ]);
    const sockets = [admin, tech, cleaner, own, foreign];
    const records = sockets.map(client => {
      const record = { tickets: [] as any[], seats: [] as any[], notifications: [] as any[] };
      client.on('ticket_update', data => record.tickets.push(data));
      client.on('machine_status_update', data => record.seats.push(data));
      client.on('notification', data => record.notifications.push(data));
      return record;
    });
    await Promise.all(sockets.map(client => ack(client, 'subscribe', { topic: 'tickets' })));
    await Promise.all(sockets.map(client => ack(client, 'subscribe', { topic: 'notifications' })));
    await gateway.broadcastMachineUpdate('B-01', 'fault');
    await gateway.broadcastTicketUpdate('T-1', { status: 'accepted' });
    await gateway.broadcastNotification({ message: '管理通知' });
    await barrier(sockets);
    expect(records.map(record => record.seats.length)).toEqual([1, 1, 1, 1, 1]);
    expect(records.map(record => record.tickets.length)).toEqual([1, 1, 0, 1, 0]);
    expect(records.map(record => record.notifications.length)).toEqual([1, 0, 0, 0, 0]);
  });

  it('心跳、伪造故障与客户端广播不能更改业务状态或通知其他人', async () => {
    const [sender, receiver] = await Promise.all([open(token('customer')), open(token('admin'))]);
    const seen: unknown[] = [];
    receiver.on('new_alert', data => seen.push(data));
    receiver.on('machine_status_update', data => seen.push(data));
    expect(await ack(sender, 'heartbeat', { machine_id: 'B-01', status: 'online' })).toEqual({ ok: true });
    expect(await ack(sender, 'fault_alert', { machine_id: 'B-01' })).toEqual({ ok: false, error: 'HTTP_API_REQUIRED' });
    sender.emit('machine_status_update', { machine_id: 'B-01', status: 'online' });
    await barrier([sender, receiver]);
    expect(seen).toEqual([]);
    expect((await source.getRepository(Machine).findOneByOrFail({ id: 'B-01' })).status).toBe('offline');
    expect(await source.getRepository(FaultTicket).count()).toBe(0);
  });

  it.each(['customer', 'technician'])('%s身份变更后，下一次发送前断开且不泄露事件', async role => {
    await ticket();
    const client = await open(token(role));
    await ack(client, 'subscribe', { topic: 'tickets' });
    const seen: unknown[] = [];
    client.on('ticket_update', data => seen.push(data));
    const disconnected = new Promise<void>(resolve => client.once('disconnect', () => resolve()));
    if (role === 'customer') await source.getRepository(User).update(1, { isActive: false });
    else await source.getRepository(Staff).update(actorId(role), { role: 'cleaner' });
    await gateway.broadcastTicketUpdate('T-1', { status: 'accepted' });
    await disconnected;
    expect(seen).toEqual([]);
    expect(client.connected).toBe(false);
  });

  it('静默连接也在令牌到期后断开', async () => {
    const client = await open(jwt.sign({ sub: 1, role: 'customer', exp: Math.floor(Date.now() / 1000) + 2 }));
    await new Promise<void>(resolve => client.once('disconnect', () => resolve()));
    expect(client.connected).toBe(false);
  });

  it('顾客停用后的下一个入站消息被拒绝并断开', async () => {
    const client = await open(token('customer'));
    await source.getRepository(User).update(1, { isActive: false });
    const disconnected = new Promise<void>(resolve => client.once('disconnect', () => resolve()));
    const seen: unknown[] = [];
    client.on('heartbeat_ack', data => seen.push(data));
    client.emit('heartbeat', {});
    await disconnected;
    expect(seen).toEqual([]);
  });

  it('定向故障告警不能投递给保洁或顾客', async () => {
    const [admin, cleaner, customer] = await Promise.all([open(token('admin')), open(token('cleaner')), open(token('customer'))]);
    const sockets = [admin, cleaner, customer];
    const records = sockets.map(client => { const data: unknown[] = []; client.on('new_alert', event => data.push(event)); return data; });
    for (const client of sockets) await gateway.sendAlertToClient(client.id!, { message: '工单告警' });
    await barrier(sockets);
    expect(records.map(data => data.length)).toEqual([1, 0, 0]);
  });
});
