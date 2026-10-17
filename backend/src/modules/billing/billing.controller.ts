import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, ForbiddenException, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { StaffGuard } from '../auth/staff.guard';
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
  getActiveSessions(@Request() req) {
    return this.billingService.getActiveSessions(req.user.role === 'customer' ? req.user.id : undefined);
  }

  @Get('history')
  history(@Request() req) { return this.billingService.getHistory(req.user.id); }

  @Post('sessions')
  @ApiOperation({ summary: '开始会话' })
  startSession(@Request() req, @Body() data: { userId: number; machineId: string }) {
    if (req.user.role === 'customer' && data.userId !== req.user.id) throw new ForbiddenException('无权操作其他用户');
    return this.billingService.startSession(data.userId, data.machineId);
  }

  @Patch('sessions/:id/end')
  @ApiOperation({ summary: '结束会话' })
  async endSession(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.role === 'customer') await this.billingService.assertOwner(id, req.user.id);
    return this.billingService.endSession(id);
  }

  @Patch('sessions/:id/pause')
  @ApiOperation({ summary: '暂停会话' })
  async pauseSession(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.role === 'customer') await this.billingService.assertOwner(id, req.user.id);
    return this.billingService.pauseSession(id);
  }

  @Patch('sessions/:id/resume')
  @ApiOperation({ summary: '恢复会话' })
  async resumeSession(@Param('id', ParseIntPipe) id: number, @Request() req) {
    if (req.user.role === 'customer') await this.billingService.assertOwner(id, req.user.id);
    return this.billingService.resumeSession(id);
  }

  @Get('transactions')
  @ApiOperation({ summary: '获取交易记录' })
  @ApiQuery({ name: 'userId', required: false })
  @ApiQuery({ name: 'type', required: false })
  getTransactions(@Request() req, @Query('userId') userId?: number, @Query('type') type?: string) {
    return this.billingService.getTransactions(req.user.role === 'customer' ? req.user.id : userId, type);
  }

  @Post('recharge')
  @UseGuards(StaffGuard)
  @ApiOperation({ summary: '用户充值' })
  recharge(@Body() data: { userId: number; amount: number; paymentMethod: string }) {
    return this.billingService.recharge(data.userId, data.amount, data.paymentMethod);
  }
}
