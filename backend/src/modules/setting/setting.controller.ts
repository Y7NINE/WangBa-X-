import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { SettingService } from './setting.service';
import { StaffGuard } from '../auth/staff.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('系统设置')
@Controller('settings')
@UseGuards(JwtAuthGuard, StaffGuard)
@ApiBearerAuth()
export class SettingController {
  constructor(private settingService: SettingService) {}

  @Get()
  @ApiOperation({ summary: '获取系统设置' })
  getSettings() {
    return this.settingService.getSettings();
  }

  @Put()
  @ApiOperation({ summary: '更新系统设置' })
  updateSettings(@Body() data: any) {
    return this.settingService.updateSettings(data);
  }
}
