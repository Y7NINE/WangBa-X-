import { Controller, Get, Post, Patch, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CleaningService } from './cleaning.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('保洁管理')
@Controller('cleaning')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CleaningController {
  constructor(private cleaningService: CleaningService) {}

  @Get('tasks/pending')
  @ApiOperation({ summary: '获取待处理任务' })
  findPendingTasks() {
    return this.cleaningService.findPendingTasks();
  }

  @Get('tasks/completed')
  @ApiOperation({ summary: '获取已完成任务' })
  findCompletedTasks() {
    return this.cleaningService.findCompletedTasks();
  }

  @Post('tasks/:id/start')
  @ApiOperation({ summary: '开始清理' })
  startCleaning(@Param('id') id: number, @Request() req) {
    return this.cleaningService.startCleaning(id, req.user.id);
  }

  @Post('tasks/:id/complete')
  @ApiOperation({ summary: '完成清理' })
  completeCleaning(@Param('id') id: number) {
    return this.cleaningService.completeCleaning(id);
  }
}
