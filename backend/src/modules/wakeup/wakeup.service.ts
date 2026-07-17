import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WakeUpConfig } from './wake-up-config.entity';

@Injectable()
export class WakeupService {
  constructor(
    @InjectRepository(WakeUpConfig)
    private configRepository: Repository<WakeUpConfig>,
  ) {}

  async findByUser(userId: number): Promise<WakeUpConfig[]> {
    return this.configRepository.find({
      where: { userId, status: 'scheduled' },
    });
  }

  async create(data: Partial<WakeUpConfig>): Promise<WakeUpConfig> {
    const config = this.configRepository.create(data);
    return this.configRepository.save(config);
  }

  async cancel(id: number): Promise<WakeUpConfig> {
    const config = await this.configRepository.findOne({ where: { id } });
    if (!config) {
      throw new NotFoundException('配置不存在');
    }
    config.status = 'cancelled';
    return this.configRepository.save(config);
  }

  async getActiveConfigs(): Promise<WakeUpConfig[]> {
    return this.configRepository.find({
      where: { status: 'scheduled' },
    });
  }
}
