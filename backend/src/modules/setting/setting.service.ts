import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Setting } from './setting.entity';

@Injectable()
export class SettingService {
  constructor(
    @InjectRepository(Setting)
    private settingRepository: Repository<Setting>,
  ) {}

  // 获取系统设置（单行记录，不存在时创建默认配置）
  async getSettings(): Promise<Setting> {
    const rows = await this.settingRepository.find({ take: 1 });
    if (rows.length > 0) {
      return rows[0];
    }

    const setting = this.settingRepository.create();
    return this.settingRepository.save(setting);
  }

  // 更新系统设置（局部更新）
  async updateSettings(data: Partial<Setting>): Promise<Setting> {
    const setting = await this.getSettings();
    Object.assign(setting, data);
    return this.settingRepository.save(setting);
  }
}
