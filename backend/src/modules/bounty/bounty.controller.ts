import { Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BountyService } from './bounty.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('悬赏任务')
@Controller('bounty')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class BountyController {
  constructor(private bountyService: BountyService) {}

  @Get('tasks')
  @ApiOperation({ summary: '获取所有任务' })
  findAll() {
    return this.bountyService.findAll();
  }

  @Get('tasks/:id')
  @ApiOperation({ summary: '获取任务详情' })
  findOne(@Param('id') id: string) {
    return this.bountyService.findOne(id);
  }

  @Get('progress')
  @ApiOperation({ summary: '获取用户任务进度' })
  getUserProgress(@Request() req) {
    return this.bountyService.getUserProgress(req.user.id);
  }

  @Post('tasks/:id/claim')
  @ApiOperation({ summary: '领取奖励' })
  claimReward(@Param('id') taskId: string, @Request() req) {
    return this.bountyService.claimReward(req.user.id, taskId);
  }
}
