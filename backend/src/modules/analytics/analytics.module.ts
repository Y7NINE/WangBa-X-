import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Session } from '../billing/session.entity';
import { Transaction } from '../billing/transaction.entity';
import { Machine } from '../machine/machine.entity';
import { FaultTicket } from '../fault/fault-ticket.entity';
import { Area } from '../area/area.entity';
import { User } from '../user/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Transaction, Machine, FaultTicket, Area, User]),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
