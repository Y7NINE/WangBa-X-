import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WakeupService } from './wakeup.service';
import { WakeupController } from './wakeup.controller';
import { WakeUpConfig } from './wake-up-config.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WakeUpConfig])],
  controllers: [WakeupController],
  providers: [WakeupService],
  exports: [WakeupService],
})
export class WakeupModule {}
