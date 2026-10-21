import { Injectable, BadRequestException, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Session } from './session.entity';
import { Transaction } from './transaction.entity';
import { User } from '../user/user.entity';
import { Machine } from '../machine/machine.entity';
import { Area } from '../area/area.entity';
import { CleaningTask } from '../cleaning/cleaning-task.entity';
import { FaultTicket } from '../fault/fault-ticket.entity';
import { localTransaction } from '../../common/local-transaction';
import { EventsGateway } from '../../common/gateway/events.gateway';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Session) private sessions: Repository<Session>,
    @InjectRepository(Transaction) private transactions: Repository<Transaction>,
    private source: DataSource,
    private events: EventsGateway,
  ) {}

  private duration(session: Session, now = new Date()): number {
    const until = session.endTime || (session.status === 'paused' && session.pausedAt ? session.pausedAt : now);
    return Math.max(0, Math.ceil((new Date(until).getTime() - new Date(session.startTime).getTime()) / 60000 - Number(session.pausedDuration || 0)));
  }
  private amount(minutes: number, rate: number): number { return Math.round(minutes * rate / 60 * 100) / 100; }
  private async rate(session: Session): Promise<number> {
    if (session.hourlyRate != null) return Number(session.hourlyRate);
    const machine = await this.source.getRepository(Machine).findOneBy({ id: session.machineId });
    const area = machine && await this.source.getRepository(Area).findOneBy({ id: machine.areaId });
    return Number(area?.pricePerHour || 10);
  }
  private async decorate(session: Session) {
    if (session.settlementRequestedAt && session.status === 'paused') return { ...session, amount: Number(session.amount) };
    if (['active', 'paused'].includes(session.status)) {
      const duration = this.duration(session);
      return { ...session, duration, amount: this.amount(duration, await this.rate(session)) };
    }
    return session;
  }
  async assertOwner(id: number, userId: number) {
    const session = await this.sessions.findOneBy({ id: Number(id) });
    if (!session) throw new NotFoundException('会话不存在');
    if (session.userId !== userId) throw new ForbiddenException('无权操作他人的上机会话');
  }
  async getActiveSessions(userId?: number) {
    const userFilter = userId !== undefined ? { userId } : {};
    const rows = await this.sessions.find({ where: [{ status: 'active', ...userFilter }, { status: 'paused', ...userFilter }], order: { startTime: 'DESC' } });
    return Promise.all(rows.map(row => this.decorate(row)));
  }
  async getHistory(userId: number) {
    return this.sessions.find({ where: { userId }, order: { startTime: 'DESC' }, take: 50 });
  }
  async startSession(userId: number, machineId: string) {
    if (!Number.isInteger(userId) || userId < 1 || typeof machineId !== 'string') throw new BadRequestException('用户或座位参数不正确');
    const session = await localTransaction(this.source, async manager => {
      const user = await manager.findOneBy(User, { id: userId });
      if (!user || !user.isActive) throw new BadRequestException('用户不存在或已停用');
      if (Number(user.balance) <= 0) throw new BadRequestException('余额不足，请联系前台充值');
      const existing = await manager.findOne(Session, { where: [{ userId, status: 'active' }, { userId, status: 'paused' }] });
      if (existing) throw new BadRequestException('已有进行中的上机会话');
      const machine = await manager.findOneBy(Machine, { id: machineId });
      if (!machine) throw new NotFoundException('座位不存在');
      if (machine.status !== 'offline') throw new BadRequestException('该座位暂不可用，请刷新后重选');
      const occupied = await manager.findOne(Session, { where: [{ machineId, status: 'active' }, { machineId, status: 'paused' }] });
      if (occupied) throw new BadRequestException('该座位已有进行中的会话');
      const area = await manager.findOneBy(Area, { id: machine.areaId });
      if (!area || area.status !== 'active' || !Number.isFinite(Number(area.pricePerHour)) || Number(area.pricePerHour) < 0) throw new BadRequestException('区域费率未正确配置');
      const saved = await manager.save(Session, manager.create(Session, { userId, machineId, startTime: new Date(), status: 'active', hourlyRate: Number(area.pricePerHour) }));
      await manager.update(Machine, machineId, { status: 'online', currentUserId: userId, sessionId: saved.id });
      return saved;
    });
    this.events.broadcastMachineUpdate(machineId, 'online');
    return this.decorate(session);
  }
  async endSession(id: number) {
    const result = await localTransaction(this.source, async manager => {
      const session = await manager.findOneBy(Session, { id: Number(id) });
      if (!session) throw new NotFoundException('会话不存在');
      if (session.status === 'completed') return { session, status: '', changed: false };
      if (!['active', 'paused'].includes(session.status)) throw new BadRequestException('会话状态不允许结算');
      const endTime = session.settlementRequestedAt || new Date();
      const duration = session.settlementRequestedAt ? session.duration : this.duration(session, endTime);
      const amount = session.settlementRequestedAt ? Number(session.amount) : this.amount(duration, await this.rate(session));
      const user = await manager.findOneBy(User, { id: session.userId });
      if (!user) throw new NotFoundException('用户不存在');
      const balanceCents = Math.round(Number(user.balance) * 100);
      const amountCents = Math.round(amount * 100);
      if (balanceCents < amountCents) {
        if (!session.settlementRequestedAt) {
          Object.assign(session, {
            settlementRequestedAt: endTime, duration, amount, status: 'paused',
            pausedAt: session.status === 'paused' && session.pausedAt ? session.pausedAt : endTime,
          });
          await manager.save(Session, session);
        }
        // Return from the transaction so the freeze commits before HTTP reports insufficient funds.
        return { session, status: '', changed: false, balance: balanceCents / 100, shortfall: (amountCents - balanceCents) / 100 };
      }
      const balanceAfter = (balanceCents - amountCents) / 100;
      await manager.update(User, user.id, { balance: balanceAfter });
      const pausedDuration = Number(session.pausedDuration || 0) +
        (session.status === 'paused' && session.pausedAt ? Math.max(0, (new Date(endTime).getTime() - new Date(session.pausedAt).getTime()) / 60000) : 0);
      Object.assign(session, { endTime, duration, amount, pausedDuration, pausedAt: null, status: 'completed' });
      const saved = await manager.save(Session, session);
      await manager.save(Transaction, manager.create(Transaction, { userId: user.id, type: 'consume', amount, balanceAfter, paymentMethod: 'balance', referenceId: String(saved.id), description: `上机结算 ${session.machineId} ${duration}分钟` }));
      const tickets = await manager.find(FaultTicket, { where: { machineId: session.machineId } });
      const unresolved = tickets.some(ticket => ['pending', 'accepted', 'processing', 'escalated'].includes(ticket.status));
      const status = unresolved ? 'fault' : 'dirty';
      await manager.update(Machine, session.machineId, { status, currentUserId: null as any, sessionId: null as any });
      if (!unresolved) await manager.save(CleaningTask, manager.create(CleaningTask, { machineId: session.machineId, status: 'pending', createdAt: new Date() }));
      return { session: saved, status, changed: true };
    });
    const shortfall = result.shortfall ?? 0;
    if (shortfall > 0) throw new ConflictException({
      code: 'SETTLEMENT_PAYMENT_REQUIRED', sessionId: result.session.id,
      amount: Number(result.session.amount), balance: result.balance, shortfall,
      message: `已停止计费，账单¥${Number(result.session.amount).toFixed(2)}，还需补款¥${shortfall.toFixed(2)}后重试结算；座位暂保留占用`,
    });
    if (result.changed) this.events.broadcastMachineUpdate(result.session.machineId, result.status);
    return result.session;
  }
  async pauseSession(id: number) {
    return localTransaction(this.source, async manager => {
      const session = await manager.findOneBy(Session, { id: Number(id) });
      if (!session || session.status !== 'active') throw new BadRequestException('会话状态不允许暂停');
      session.status = 'paused'; session.pausedAt = new Date();
      return manager.save(Session, session);
    });
  }
  async resumeSession(id: number) {
    return localTransaction(this.source, async manager => {
      const session = await manager.findOneBy(Session, { id: Number(id) });
      if (!session || session.status !== 'paused') throw new BadRequestException('会话状态不允许恢复');
      if (session.settlementRequestedAt) throw new BadRequestException('会话已申请结算，请补足余额后完成结算，不能恢复计费');
      session.pausedDuration = Number(session.pausedDuration || 0) + (Date.now() - new Date(session.pausedAt).getTime()) / 60000;
      session.status = 'active'; session.pausedAt = null as any;
      return manager.save(Session, session);
    });
  }
  async getTransactions(userId?: number, type?: string) {
    return this.transactions.find({ where: { ...(userId !== undefined ? { userId } : {}), ...(type ? { type } : {}) }, order: { createdAt: 'DESC' }, take: 100 });
  }
  async getRechargeResult(requestId: string, operatorId: number) {
    if (!isUUID(requestId, '4') || !Number.isSafeInteger(operatorId) || operatorId < 1) {
      throw new BadRequestException('充值结果查询须提供有效请求编号和操作员');
    }
    // Queue the confirmation read too: this SQLite connection must not expose an
    // in-flight write that may still roll back before its transaction commits.
    return localTransaction(this.source, async manager => {
      const result = await manager.findOneBy(Transaction, { requestId: requestId.toLowerCase(), operatorId, type: 'recharge' });
      if (!result) throw new NotFoundException('尚未查到该充值结果，请使用原请求编号确认或重试');
      return result;
    });
  }
  async recharge(userId: number, amount: number, paymentMethod: string, operatorId: number, requestId: string) {
    if (!isUUID(requestId, '4')) throw new BadRequestException('充值须提供UUID v4请求编号');
    requestId = requestId.toLowerCase();
    if (!Number.isSafeInteger(operatorId) || operatorId < 1) throw new BadRequestException('充值须记录有效操作员');
    if (!Number.isSafeInteger(userId) || userId < 1 || !Number.isFinite(amount) || amount <= 0 || amount > 10000 || Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001) throw new BadRequestException('充值金额须为0.01至10000元，最多两位小数');
    if (!['cash', 'wechat', 'alipay', 'demo'].includes(paymentMethod)) throw new BadRequestException('充值方式不正确');
    return localTransaction(this.source, async manager => {
      const original = await manager.findOneBy(Transaction, { requestId });
      if (original) {
        if (original.type !== 'recharge' || original.operatorId !== operatorId || original.userId !== userId ||
          Math.round(Number(original.amount) * 100) !== Math.round(amount * 100) || original.paymentMethod !== paymentMethod) {
          throw new ConflictException('请求编号已用于不同的充值，请先核对原充值记录');
        }
        return original;
      }
      const user = await manager.findOneBy(User, { id: userId });
      if (!user) throw new NotFoundException('用户不存在');
      const balanceAfter = Math.round((Number(user.balance) + amount) * 100) / 100;
      await manager.update(User, userId, { balance: balanceAfter });
      return manager.save(Transaction, manager.create(Transaction, { userId, type: 'recharge', amount, balanceAfter, paymentMethod, operatorId, requestId, description: `前台记账充值 ¥${amount}` }));
    });
  }
}
