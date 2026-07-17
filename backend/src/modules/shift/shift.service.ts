import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import moment from 'moment';
import { ShiftHandover } from './shift-handover.entity';

@Injectable()
export class ShiftService {
  constructor(
    @InjectRepository(ShiftHandover)
    private handoverRepository: Repository<ShiftHandover>,
  ) {}

  async findAll(): Promise<ShiftHandover[]> {
    return this.handoverRepository.find({
      order: { createdAt: 'DESC' },
    });
  }

  async create(data: {
    outgoingStaffId: number;
    incomingStaffId: number;
    shiftType: string;
    actualCash: number;
    expectedCash: number;
    notes?: string;
  }): Promise<ShiftHandover> {
    const cashDifference = data.actualCash - data.expectedCash;
    const cashStatus = Math.abs(cashDifference) <= 10 ? 'normal' : 'abnormal';
    
    const id = `HO${moment().format('YYYYMMDD')}-${Date.now()}`;
    
    const handover = this.handoverRepository.create({
      id,
      outgoingStaffId: data.outgoingStaffId,
      incomingStaffId: data.incomingStaffId,
      shiftType: data.shiftType,
      handoverTime: new Date(),
      expectedCash: data.expectedCash,
      actualCash: data.actualCash,
      cashDifference,
      cashStatus,
      inventoryStatus: 'normal',
      status: cashStatus === 'normal' ? 'completed' : 'locked',
      notes: data.notes,
    });

    return this.handoverRepository.save(handover);
  }
}
