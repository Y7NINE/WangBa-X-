import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MachineService } from './machine.service';
import { MachineController } from './machine.controller';
import { Machine } from './machine.entity';
import { Area } from '../area/area.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Machine, Area])],
  controllers: [MachineController],
  providers: [MachineService],
  exports: [MachineService],
})
export class MachineModule {}
