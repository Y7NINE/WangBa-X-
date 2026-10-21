import { Body, Controller, Get, Post, Param, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BountyService } from './bounty.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { EmptyActionDto } from '../../common/empty-action.dto';

@ApiTags('悬赏任务')
@Controller('bounty')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('customer')
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
  claimReward(@Param('id') taskId: string, @Body() _data: EmptyActionDto, @Request() req) {
    return this.bountyService.claimReward(req.user.id, taskId);
  }
}
