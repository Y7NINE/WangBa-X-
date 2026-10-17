import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
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
    const rows = await this.sessions.find({ where: [{ status: 'active', ...(userId ? { userId } : {}) }, { status: 'paused', ...(userId ? { userId } : {}) }], order: { startTime: 'DESC' } });
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
      const endTime = new Date();
      const duration = this.duration(session, endTime);
      const amount = this.amount(duration, await this.rate(session));
      const user = await manager.findOneBy(User, { id: session.userId });
      if (!user) throw new NotFoundException('用户不存在');
      if (Number(user.balance) < amount) throw new BadRequestException('余额不足，请联系前台补足余额后结算');
      const balanceAfter = Math.round((Number(user.balance) - amount) * 100) / 100;
      await manager.update(User, user.id, { balance: balanceAfter });
      Object.assign(session, { endTime, duration, amount, status: 'completed' });
      const saved = await manager.save(Session, session);
      await manager.save(Transaction, manager.create(Transaction, { userId: user.id, type: 'consume', amount, balanceAfter, paymentMethod: 'balance', referenceId: String(saved.id), description: `上机结算 ${session.machineId} ${duration}分钟` }));
      const tickets = await manager.find(FaultTicket, { where: { machineId: session.machineId } });
      const unresolved = tickets.some(ticket => ['pending', 'accepted', 'processing', 'escalated'].includes(ticket.status));
      const status = unresolved ? 'fault' : 'dirty';
      await manager.update(Machine, session.machineId, { status, currentUserId: null as any, sessionId: null as any });
      if (!unresolved) await manager.save(CleaningTask, manager.create(CleaningTask, { machineId: session.machineId, status: 'pending', createdAt: endTime }));
      return { session: saved, status, changed: true };
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
      session.pausedDuration = Number(session.pausedDuration || 0) + (Date.now() - new Date(session.pausedAt).getTime()) / 60000;
      session.status = 'active'; session.pausedAt = null as any;
      return manager.save(Session, session);
    });
  }
  async getTransactions(userId?: number, type?: string) {
    return this.transactions.find({ where: { ...(userId ? { userId } : {}), ...(type ? { type } : {}) }, order: { createdAt: 'DESC' }, take: 100 });
  }
  async recharge(userId: number, amount: number, paymentMethod: string) {
    if (!Number.isInteger(userId) || !Number.isFinite(amount) || amount <= 0 || amount > 10000 || Math.abs(Math.round(amount * 100) - amount * 100) > 0.000001) throw new BadRequestException('充值金额须为0.01至10000元，最多两位小数');
    if (!['cash', 'wechat', 'alipay', 'demo'].includes(paymentMethod)) throw new BadRequestException('充值方式不正确');
    return localTransaction(this.source, async manager => {
      const user = await manager.findOneBy(User, { id: userId });
      if (!user) throw new NotFoundException('用户不存在');
      const balanceAfter = Math.round((Number(user.balance) + amount) * 100) / 100;
      await manager.update(User, userId, { balance: balanceAfter });
      return manager.save(Transaction, manager.create(Transaction, { userId, type: 'recharge', amount, balanceAfter, paymentMethod, description: `前台记账充值 ¥${amount}` }));
    });
  }
}
