import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { randomUUID } from 'crypto';
import { FaultTicket } from './fault-ticket.entity';
import { FaultType } from './fault-type.entity';
import { Session } from '../billing/session.entity';
import { Machine } from '../machine/machine.entity';
import { CleaningTask } from '../cleaning/cleaning-task.entity';
import { localTransaction } from '../../common/local-transaction';
import { EventsGateway } from '../../common/gateway/events.gateway';

@Injectable()
export class FaultService {
  constructor(@InjectRepository(FaultTicket) private tickets: Repository<FaultTicket>, @InjectRepository(FaultType) private types: Repository<FaultType>, private source: DataSource, private events: EventsGateway) {}
  findAll(status?: string, priority?: string, reporterId?: number) {
    return this.tickets.find({ where: { ...(status ? { status } : {}), ...(priority ? { priority } : {}), ...(reporterId ? { reporterId, reporterType: 'player' } : {}) }, order: { createdAt: 'DESC' }, take: 100 });
  }
  async findOne(id: string) {
    const ticket = await this.tickets.findOneBy({ id });
    if (!ticket) throw new NotFoundException('工单不存在');
    return ticket;
  }
  async assertOwner(id: string, userId: number) {
    const ticket = await this.findOne(id);
    if (ticket.reporterType !== 'player' || ticket.reporterId !== userId) throw new ForbiddenException('无权查看此工单');
  }
  async create(data: { machineId: string; faultType: string; description?: string; source?: string; reporterId?: number; reporterType?: string; playerAction?: string }) {
    const saved = await localTransaction(this.source, async manager => {
      const type = await manager.findOneBy(FaultType, { id: data.faultType, isActive: true });
      if (!type) throw new BadRequestException('无效的故障类型');
      const machine = await manager.findOneBy(Machine, { id: data.machineId });
      if (!machine) throw new NotFoundException('座位不存在');
      if (data.reporterType === 'player') {
        const session = await manager.findOne(Session, { where: [{ machineId: machine.id, userId: data.reporterId, status: 'active' }, { machineId: machine.id, userId: data.reporterId, status: 'paused' }] });
        if (!session) throw new ForbiddenException('只能为当前上机座位报修');
      }
      const existing = await manager.find(FaultTicket, { where: { machineId: machine.id, faultType: data.faultType } });
      const open = existing.find(ticket => ['pending', 'accepted', 'processing', 'escalated'].includes(ticket.status));
      if (open) throw new BadRequestException('该问题已报修，请勿重复提交');
      const ticket = await manager.save(FaultTicket, manager.create(FaultTicket, { id: `T-${randomUUID().slice(0, 20)}`, machineId: machine.id, faultType: type.id, faultCategory: type.category, source: data.source || 'staff_report', reporterType: data.reporterType || 'staff', reporterId: data.reporterId, priority: type.defaultPriority, status: 'pending', description: String(data.description || '').slice(0, 2000), playerAction: data.playerAction, timeoutAt: new Date(Date.now() + type.timeoutMinutes * 60000) }));
      await manager.update(Machine, machine.id, { status: 'fault', faultType: type.id, faultTime: new Date() });
      return ticket;
    });
    this.events.broadcastMachineUpdate(saved.machineId, 'fault');
    return saved;
  }
  async accept(id: string, handlerId: number) {
    return localTransaction(this.source, async manager => {
      const ticket = await manager.findOneBy(FaultTicket, { id });
      if (!ticket || ticket.status !== 'pending') throw new BadRequestException('工单状态不允许接单');
      Object.assign(ticket, { status: 'accepted', handlerId, acceptedAt: new Date() });
      return manager.save(FaultTicket, ticket);
    });
  }
  async resolve(id: string, data: { resolution: string; note?: string }) {
    const result = await localTransaction(this.source, async manager => {
      const ticket = await manager.findOneBy(FaultTicket, { id });
      if (!ticket || !['accepted', 'processing'].includes(ticket.status)) throw new BadRequestException('请先接单再完成维修');
      Object.assign(ticket, { status: 'resolved', resolution: String(data.resolution || '已修复').slice(0, 50), resolutionNote: data.note || '', resolvedAt: new Date() });
      await manager.save(FaultTicket, ticket);
      const other = (await manager.find(FaultTicket, { where: { machineId: ticket.machineId } })).some(row => ['pending', 'accepted', 'processing', 'escalated'].includes(row.status));
      const session = await manager.findOne(Session, { where: [{ machineId: ticket.machineId, status: 'active' }, { machineId: ticket.machineId, status: 'paused' }] });
      const status = other ? 'fault' : session ? 'online' : 'dirty';
      await manager.update(Machine, ticket.machineId, { status, ...(other ? {} : { faultType: null as any, faultTime: null as any }) });
      if (status === 'dirty') {
        const tasks = await manager.find(CleaningTask, { where: { machineId: ticket.machineId } });
        if (!tasks.some(row => ['pending', 'in_progress'].includes(row.status))) await manager.save(CleaningTask, manager.create(CleaningTask, { machineId: ticket.machineId, status: 'pending', createdAt: new Date() }));
      }
      return { ticket, status };
    });
    this.events.broadcastMachineUpdate(result.ticket.machineId, result.status);
    return result.ticket;
  }
  async transfer(id: string, newMachineId: string) {
    const result = await localTransaction(this.source, async manager => {
      const ticket = await manager.findOneBy(FaultTicket, { id });
      if (!ticket || !['accepted', 'processing'].includes(ticket.status)) throw new BadRequestException('工单状态不允许换机');
      const machine = await manager.findOneBy(Machine, { id: newMachineId });
      if (!machine || machine.status !== 'offline') throw new BadRequestException('目标座位不可用');
      const session = await manager.findOne(Session, { where: [{ machineId: ticket.machineId, status: 'active' }, { machineId: ticket.machineId, status: 'paused' }] });
      if (!session) throw new BadRequestException('原座位没有可转移的上机会话');
      await manager.update(Session, session.id, { machineId: newMachineId });
      await manager.update(Machine, newMachineId, { status: 'online', currentUserId: session.userId, sessionId: session.id });
      await manager.update(Machine, ticket.machineId, { status: 'fault', currentUserId: null as any, sessionId: null as any });
      Object.assign(ticket, { newMachineId, transferredAt: new Date(), playerAction: 'transferred' });
      // Repair ticket stays accepted: the original machine still needs repair.
      return manager.save(FaultTicket, ticket);
    });
    this.events.broadcastMachineUpdate(result.machineId, 'fault');
    this.events.broadcastMachineUpdate(newMachineId, 'online');
    return result;
  }
  getFaultTypes() { return this.types.find({ where: { isActive: true } }); }
}
