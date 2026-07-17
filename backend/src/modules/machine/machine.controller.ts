import { Controller, Get, Param, Patch, Body, Query, UseGuards, SetMetadata } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MachineService } from './machine.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('机器管理')
@Controller('machines')
export class MachineController {
  constructor(private machineService: MachineService) {}

  @Get()
  @ApiOperation({ summary: '获取所有机器（公开）' })
  @ApiQuery({ name: 'areaId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Query('areaId') areaId?: number, @Query('status') status?: string) {
    return this.machineService.findAll(areaId, status);
  }

  @Get('stats/overview')
  @ApiOperation({ summary: '获取机器统计（公开）' })
  getStats() {
    return this.machineService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取机器详情（公开）' })
  findOne(@Param('id') id: string) {
    return this.machineService.findOne(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新机器状态（需认证）' })
  updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.machineService.updateStatus(id, status);
  }
}
