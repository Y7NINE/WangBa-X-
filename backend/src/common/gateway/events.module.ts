import { Module } from '@nestjs/common';
import { EventsGateway } from './events.gateway';
import { TokenModule } from '../../modules/auth/token.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Staff } from '../../modules/user/staff.entity';
import { User } from '../../modules/user/user.entity';
import { FaultTicket } from '../../modules/fault/fault-ticket.entity';
import { SocketPolicy } from './socket-policy';

@Module({
  imports: [TokenModule, TypeOrmModule.forFeature([Staff, User, FaultTicket])],
  providers: [EventsGateway, SocketPolicy],
  exports: [EventsGateway],
})
export class EventsModule {}
