import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BountyService } from './bounty.service';
import { BountyController } from './bounty.controller';
import { BountyTask } from './bounty-task.entity';
import { UserTaskProgress } from './user-task-progress.entity';
import { Badge } from './badge.entity';
import { UserBadge } from './user-badge.entity';

@Module({
  imports: [TypeOrmModule.forFeature([BountyTask, UserTaskProgress, Badge, UserBadge])],
  controllers: [BountyController],
  providers: [BountyService],
  exports: [BountyService],
})
export class BountyModule {}
