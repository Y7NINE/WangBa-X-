import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { CleaningTask } from './cleaning-task.entity';
import { Machine } from '../machine/machine.entity';
import { Session } from '../billing/session.entity';
import { localTransaction } from '../../common/local-transaction';
import { EventsGateway } from '../../common/gateway/events.gateway';
import { StaffActor } from '../auth/roles.decorator';

@Injectable()
export class CleaningService {
  constructor(@InjectRepository(CleaningTask) private tasks: Repository<CleaningTask>, private source: DataSource, private events: EventsGateway) {}
  findPendingTasks() { return this.tasks.find({ where: [{ status: 'pending' }, { status: 'in_progress' }], order: { createdAt: 'ASC' } }); }
  findCompletedTasks() { return this.tasks.find({ where: { status: 'completed' }, order: { completedAt: 'DESC' }, take: 100 }); }
  async startCleaning(id: number, cleanerId: number) {
    const task = await localTransaction(this.source, async manager => {
      const task = await manager.findOneBy(CleaningTask, { id: Number(id) });
      if (!task) throw new NotFoundException('任务不存在');
      if (task.status !== 'pending') throw new BadRequestException('任务已经开始或完成');
      const machine = await manager.findOneBy(Machine, { id: task.machineId });
      if (!machine || machine.status !== 'dirty') throw new BadRequestException('只有待清理座位可以开始保洁');
      const session = await manager.findOne(Session, { where: [{ machineId: machine.id, status: 'active' }, { machineId: machine.id, status: 'paused' }] });
      if (session) throw new BadRequestException('座位仍在上机，不能清理');
      Object.assign(task, { status: 'in_progress', cleanerId, startedAt: new Date() });
      await manager.update(Machine, task.machineId, { status: 'cleaning' });
      return manager.save(CleaningTask, task);
    });
    this.events.broadcastMachineUpdate(task.machineId, 'cleaning');
    return task;
  }
  async completeCleaning(id: number, actor: StaffActor) {
    const result = await localTransaction(this.source, async manager => {
      const task = await manager.findOneBy(CleaningTask, { id: Number(id) });
      if (!task) throw new NotFoundException('任务不存在');
      if (!['admin', 'manager', 'cleaner'].includes(actor.role) || !Number.isSafeInteger(actor.id) || actor.id < 1) throw new ForbiddenException('当前身份不能完成保洁');
      if (['in_progress', 'completed'].includes(task.status) && actor.role === 'cleaner' && task.cleanerId !== actor.id) throw new ForbiddenException('只能完成本人开始的保洁任务');
      if (task.status === 'completed') return { task, changed: false };
      if (task.status !== 'in_progress' || !task.startedAt) throw new BadRequestException('请先开始清理');
      const machine = await manager.findOneBy(Machine, { id: task.machineId });
      if (!machine || machine.status !== 'cleaning') throw new BadRequestException('座位状态已变化，请先处理异常');
      Object.assign(task, { status: 'completed', completedAt: new Date(), completedBy: actor.id, duration: Math.ceil((Date.now() - new Date(task.startedAt).getTime()) / 1000) });
      await manager.update(Machine, task.machineId, { status: 'offline', currentUserId: null as any, sessionId: null as any });
      return { task: await manager.save(CleaningTask, task), changed: true };
    });
    if (result.changed) this.events.broadcastMachineUpdate(result.task.machineId, 'offline');
    return result.task;
  }
  createTask(machineId: string) { return this.tasks.save(this.tasks.create({ machineId, status: 'pending', createdAt: new Date() })); }
}
