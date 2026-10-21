import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WakeupService } from './wakeup.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateWakeupDto } from './wakeup.dto';

@ApiTags('智能唤醒')
@Controller('wakeup')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
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
  create(@Body() data: CreateWakeupDto, @Request() req) {
    return this.wakeupService.create(req.user.id, data);
  }

  @Delete('configs/:id')
  @ApiOperation({ summary: '取消唤醒' })
  cancel(@Param('id', ParseIntPipe) id: number, @Request() req) {
    return this.wakeupService.cancel(id, req.user.id);
  }
}
