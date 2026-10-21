import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { WakeUpConfig } from './wake-up-config.entity';
import { Session } from '../billing/session.entity';
import { localTransaction } from '../../common/local-transaction';
import { CreateWakeupDto } from './wakeup.dto';

@Injectable()
export class WakeupService {
  constructor(
    @InjectRepository(WakeUpConfig)
    private configRepository: Repository<WakeUpConfig>,
    private readonly source: DataSource,
  ) {}

  async findByUser(userId: number): Promise<WakeUpConfig[]> {
    return this.configRepository.find({
      where: { userId, status: 'scheduled' },
    });
  }

  async create(userId: number, data: CreateWakeupDto): Promise<WakeUpConfig> {
    return localTransaction(this.source, async manager => {
      const session = await manager.findOne(Session, {
        where: { userId, machineId: data.machineId, status: In(['active', 'paused']) },
      });
      if (!session) throw new BadRequestException('只能为本人当前上机座位配置唤醒');
      if (session.settlementRequestedAt) throw new BadRequestException('当前会话待结算，不能新建唤醒配置');
      // Copy only configurable fields, even for callers that bypass HTTP validation.
      const config = manager.create(WakeUpConfig, {
        userId, machineId: session.machineId, wakeTime: data.wakeTime,
        headphone: data.headphone, lightStrip: data.lightStrip, screen: data.screen,
        humanWake: data.humanWake, snoozeInterval: data.snoozeInterval, maxSnooze: data.maxSnooze,
        status: 'scheduled',
      });
      return manager.save(config);
    });
  }

  async cancel(id: number, userId: number): Promise<WakeUpConfig> {
    return localTransaction(this.source, async manager => {
      const config = await manager.findOne(WakeUpConfig, { where: { id, userId } });
      if (!config) throw new NotFoundException('配置不存在');
      if (config.status === 'cancelled') return config;
      if (config.status !== 'scheduled') throw new BadRequestException('当前状态不能取消唤醒');
      config.status = 'cancelled';
      return manager.save(config);
    });
  }

  async getActiveConfigs(): Promise<WakeUpConfig[]> {
    return this.configRepository.find({
      where: { status: 'scheduled' },
    });
  }
}
