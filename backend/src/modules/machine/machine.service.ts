import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from '../billing/session.entity';
import { Machine } from './machine.entity';

@Injectable()
export class MachineService {
  constructor(
    @InjectRepository(Machine)
    private machineRepository: Repository<Machine>,
  ) {}

  async findAll(areaId?: number, status?: string): Promise<Machine[]> {
    const where: any = {};
    if (areaId) where.areaId = areaId;
    if (status) where.status = status;

    return this.machineRepository.find({ where });
  }

  async findOne(id: string): Promise<Machine> {
    const machine = await this.machineRepository.findOne({ where: { id } });
    if (!machine) {
      throw new NotFoundException(`机器 ${id} 不存在`);
    }
    return machine;
  }

  async updateStatus(id: string, status: string): Promise<Machine> {
    const machine = await this.findOne(id);
    if (!['online', 'offline', 'fault', 'repairing', 'maintenance', 'dirty', 'cleaning'].includes(status)) throw new BadRequestException('无效的座位状态');
    if (status === 'offline') {
      const session = await this.machineRepository.manager.findOne(Session, { where: [{ machineId: id, status: 'active' }, { machineId: id, status: 'paused' }] });
      if (session) throw new BadRequestException('座位仍有上机会话，请先结算');
      if (['dirty', 'cleaning'].includes(machine.status)) throw new BadRequestException('请通过保洁任务完成清理后恢复可用');
      if (machine.status === 'fault') throw new BadRequestException('请通过维修工单恢复座位');
    }
    machine.status = status;

    if (status === 'fault') {
      machine.faultTime = new Date();
    } else if (status === 'offline' || status === 'online') {
      machine.faultType = null as any;
      machine.faultTime = null as any;
    }

    return this.machineRepository.save(machine);
  }

  async updateHeartbeat(id: string, data: any): Promise<void> {
    await this.machineRepository.update(id, {
      lastHeartbeat: new Date(),
      ...data,
    });
  }

  async getStats() {
    const total = await this.machineRepository.count();
    const online = await this.machineRepository.count({ where: { status: 'online' } });
    const offline = await this.machineRepository.count({ where: { status: 'offline' } });
    const fault = await this.machineRepository.count({ where: { status: 'fault' } });
    const dirty = await this.machineRepository.count({ where: { status: 'dirty' } });
    const cleaning = await this.machineRepository.count({ where: { status: 'cleaning' } });

    return { total, online, offline, fault, dirty, cleaning };
  }
}
