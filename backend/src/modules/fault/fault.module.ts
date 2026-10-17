import { EventsModule } from '../../common/gateway/events.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FaultService } from './fault.service';
import { FaultController } from './fault.controller';
import { FaultTicket } from './fault-ticket.entity';
import { FaultType } from './fault-type.entity';
import { MachineModule } from '../machine/machine.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([FaultTicket, FaultType]),
    MachineModule,
    EventsModule,
  ],
  controllers: [FaultController],
  providers: [FaultService],
  exports: [FaultService],
})
export class FaultModule {}
