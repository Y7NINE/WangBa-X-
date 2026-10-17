import { EventsModule } from '../../common/gateway/events.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CleaningService } from './cleaning.service';
import { CleaningController } from './cleaning.controller';
import { CleaningTask } from './cleaning-task.entity';
import { MachineModule } from '../machine/machine.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([CleaningTask]),
    MachineModule,
    EventsModule,
  ],
  controllers: [CleaningController],
  providers: [CleaningService],
  exports: [CleaningService],
})
export class CleaningModule {}
