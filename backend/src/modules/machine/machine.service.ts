import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
