import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ShiftService } from './shift.service';
import { ShiftController } from './shift.controller';
import { ShiftHandover } from './shift-handover.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ShiftHandover])],
  controllers: [ShiftController],
  providers: [ShiftService],
  exports: [ShiftService],
})
export class ShiftModule {}
