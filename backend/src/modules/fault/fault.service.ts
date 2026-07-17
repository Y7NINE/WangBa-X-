import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { FaultTicket } from './fault-ticket.entity';
import { FaultType } from './fault-type.entity';
import { MachineService } from '../machine/machine.service';

@Injectable()
export class FaultService {
  constructor(
    @InjectRepository(FaultTicket)
    private ticketRepository: Repository<FaultTicket>,
    @InjectRepository(FaultType)
    private faultTypeRepository: Repository<FaultType>,
    private machineService: MachineService,
  ) {}

  async findAll(status?: string, priority?: string): Promise<FaultTicket[]> {
    const where: any = {};
    if (status) where.status = status;
    if (priority) where.priority = priority;
    
    return this.ticketRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<FaultTicket> {
    const ticket = await this.ticketRepository.findOne({ where: { id } });
    if (!ticket) {
      throw new NotFoundException(`工单 ${id} 不存在`);
    }
    return ticket;
  }

  async create(data: {
    machineId: string;
    faultType: string;
    description?: string;
    source?: string;
    reporterId?: number;
    playerAction?: string;
  }): Promise<FaultTicket> {
    try {
      // 获取故障类型配置
      const faultType = await this.faultTypeRepository.findOne({
        where: { id: data.faultType },
      });
      
      if (!faultType) {
        throw new BadRequestException('无效的故障类型');
      }

      // 生成工单ID
      const now = new Date();
      const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
      const ticketId = `T${dateStr}-${uuidv4().substring(0, 4)}`;
      
      // 计算超时时间
      const timeoutAt = new Date(now.getTime() + faultType.timeoutMinutes * 60 * 1000);

      const ticket = this.ticketRepository.create({
        id: ticketId,
        machineId: data.machineId,
        faultType: data.faultType,
        faultCategory: faultType.category,
        source: data.source || 'staff_report',
        priority: faultType.defaultPriority,
        status: 'pending',
        reporterId: data.reporterId,
        description: data.description,
        playerAction: data.playerAction,
        timeoutAt,
      });

      // 更新机器状态
      await this.machineService.updateStatus(data.machineId, 'fault');

      return this.ticketRepository.save(ticket);
    } catch (error) {
      console.error('创建故障工单失败:', error);
      throw error;
    }
  }

  async accept(id: string, handlerId: number): Promise<FaultTicket> {
    const ticket = await this.findOne(id);
    
    if (ticket.status !== 'pending') {
      throw new BadRequestException('工单状态不允许接单');
    }

    ticket.status = 'accepted';
    ticket.handlerId = handlerId;
    ticket.acceptedAt = new Date();

    return this.ticketRepository.save(ticket);
  }

  async resolve(id: string, data: { resolution: string; note?: string }): Promise<FaultTicket> {
    const ticket = await this.findOne(id);
    
    if (!['accepted', 'processing'].includes(ticket.status)) {
      throw new BadRequestException('工单状态不允许完成');
    }

    ticket.status = 'resolved';
    ticket.resolution = data.resolution;
    ticket.resolutionNote = data.note || '';
    ticket.resolvedAt = new Date();

    // 更新机器状态为空闲
    await this.machineService.updateStatus(ticket.machineId, 'offline');

    return this.ticketRepository.save(ticket);
  }

  async transfer(id: string, newMachineId: string): Promise<FaultTicket> {
    const ticket = await this.findOne(id);
    
    if (!['accepted', 'processing'].includes(ticket.status)) {
      throw new BadRequestException('工单状态不允许换机');
    }

    ticket.status = 'transferred';
    ticket.newMachineId = newMachineId;
    ticket.transferredAt = new Date();

    return this.ticketRepository.save(ticket);
  }

  async getFaultTypes(): Promise<FaultType[]> {
    return this.faultTypeRepository.find({ where: { isActive: true } });
  }
}
