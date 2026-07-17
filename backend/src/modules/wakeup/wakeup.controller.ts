import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WakeupService } from './wakeup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('智能唤醒')
@Controller('wakeup')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class WakeupController {
  constructor(private wakeupService: WakeupService) {}

  @Get('configs')
  @ApiOperation({ summary: '获取用户唤醒配置' })
  findByUser(@Request() req) {
    return this.wakeupService.findByUser(req.user.id);
  }

  @Post('configs')
  @ApiOperation({ summary: '创建唤醒配置' })
  create(@Body() data: any, @Request() req) {
    return this.wakeupService.create({ ...data, userId: req.user.id });
  }

  @Delete('configs/:id')
  @ApiOperation({ summary: '取消唤醒' })
  cancel(@Param('id') id: number) {
    return this.wakeupService.cancel(id);
  }
}
