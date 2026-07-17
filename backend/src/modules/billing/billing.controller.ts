import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('计费管理')
@Controller('billing')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BillingController {
  constructor(private billingService: BillingService) {}

  @Get('sessions')
  @ApiOperation({ summary: '获取当前会话' })
  @ApiQuery({ name: 'status', required: false })
  getActiveSessions() {
    return this.billingService.getActiveSessions();
  }

  @Post('sessions')
  @ApiOperation({ summary: '开始会话' })
  startSession(@Body() data: { userId: number; machineId: string }) {
    return this.billingService.startSession(data.userId, data.machineId);
  }

  @Patch('sessions/:id/end')
  @ApiOperation({ summary: '结束会话' })
  endSession(@Param('id') id: number) {
    return this.billingService.endSession(id);
  }

  @Patch('sessions/:id/pause')
  @ApiOperation({ summary: '暂停会话' })
  pauseSession(@Param('id') id: number) {
    return this.billingService.pauseSession(id);
  }

  @Patch('sessions/:id/resume')
  @ApiOperation({ summary: '恢复会话' })
  resumeSession(@Param('id') id: number) {
    return this.billingService.resumeSession(id);
  }

  @Get('transactions')
  @ApiOperation({ summary: '获取交易记录' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'type', required: false })
  getTransactions(@Query('userId') userId?: number, @Query('type') type?: string) {
    return this.billingService.getTransactions(userId, type);
  }

  @Post('recharge')
  @ApiOperation({ summary: '用户充值' })
  recharge(@Body() data: { userId: number; amount: number; paymentMethod: string }) {
    return this.billingService.recharge(data.userId, data.amount, data.paymentMethod);
  }
}
