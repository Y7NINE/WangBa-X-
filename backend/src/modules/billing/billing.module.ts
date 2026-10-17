import { EventsModule } from '../../common/gateway/events.module';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { Session } from './session.entity';
import { Transaction } from './transaction.entity';
import { CreditTransaction } from './credit-transaction.entity';
import { UserModule } from '../user/user.module';
import { MachineModule } from '../machine/machine.module';
import { CleaningModule } from '../cleaning/cleaning.module';
import { AreaModule } from '../area/area.module';
import { SettingModule } from '../setting/setting.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Transaction, CreditTransaction]),
    EventsModule,
    UserModule,
    MachineModule,
    CleaningModule,
    AreaModule,
    SettingModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
