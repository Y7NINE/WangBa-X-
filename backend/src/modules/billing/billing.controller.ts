import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards, Request, BadRequestException, ForbiddenException, ParseIntPipe, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { StaffGuard } from '../auth/staff.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RechargeDto } from './recharge.dto';
import { RolesGuard } from '../auth/roles.guard';
import { MemberQueryDto, StartSessionDto, TransactionsQueryDto } from './billing.dto';

@ApiTags('计费管理')
@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager', 'cashier', 'customer')
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
  @ApiQuery({ name: 'userId', required: false, description: '员工查询须指定会员ID；顾客始终查询本人' })
  history(@Request() req, @Query() query: MemberQueryDto) {
    const userId = req.user.role === 'customer' ? req.user.id : query.userId;
    if (userId === undefined) throw new BadRequestException('请指定要查询的会员ID');
    return this.billingService.getHistory(userId);
  }

  @Post('sessions')
  @ApiOperation({ summary: '开始会话' })
  startSession(@Request() req, @Body() data: StartSessionDto) {
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
  getTransactions(@Request() req, @Query() query: TransactionsQueryDto) {
    return this.billingService.getTransactions(req.user.role === 'customer' ? req.user.id : query.userId, query.type);
  }

  @Post('recharge')
  @UseGuards(StaffGuard)
  @Roles('admin', 'manager', 'cashier')
  @ApiOperation({ summary: '用户充值' })
  recharge(@Body() data: RechargeDto, @Request() req) {
    return this.billingService.recharge(data.userId, data.amount, data.paymentMethod, req.user.id, data.requestId);
  }

  @Get('recharges/:requestId')
  @UseGuards(StaffGuard)
  @Roles('admin', 'manager', 'cashier')
  @ApiOperation({ summary: '按请求编号确认本人充值结果；404不表示原请求一定失败' })
  rechargeResult(@Param('requestId', new ParseUUIDPipe({ version: '4' })) requestId: string, @Request() req) {
    return this.billingService.getRechargeResult(requestId, req.user.id);
  }
}
