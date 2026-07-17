import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { FaultService } from './fault.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('故障运维')
@Controller('faults')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FaultController {
  constructor(private faultService: FaultService) {}

  @Get('tickets')
  @ApiOperation({ summary: '获取故障工单列表' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  findAll(@Query('status') status?: string, @Query('priority') priority?: string) {
    return this.faultService.findAll(status, priority);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: '获取工单详情' })
  findOne(@Param('id') id: string) {
    return this.faultService.findOne(id);
  }

  @Post('tickets')
  @ApiOperation({ summary: '创建故障工单' })
  create(@Body() data: {
    machineId: string;
    faultType: string;
    description?: string;
    playerAction?: string;
  }) {
    return this.faultService.create(data);
  }

  @Patch('tickets/:id/accept')
  @ApiOperation({ summary: '接单' })
  accept(@Param('id') id: string, @Request() req) {
    return this.faultService.accept(id, req.user.id);
  }

  @Patch('tickets/:id/resolve')
  @ApiOperation({ summary: '标记修复' })
  resolve(@Param('id') id, @Body() data: { resolution: string; note?: string }) {
    return this.faultService.resolve(id, data);
  }

  @Patch('tickets/:id/transfer')
  @ApiOperation({ summary: '申请换机' })
  transfer(@Param('id') id: string, @Body('newMachineId') newMachineId: string) {
    return this.faultService.transfer(id, newMachineId);
  }

  @Get('types')
  @ApiOperation({ summary: '获取故障类型列表' })
  getFaultTypes() {
    return this.faultService.getFaultTypes();
  }
}
