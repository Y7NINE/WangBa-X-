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

@Module({
  imports: [
    TypeOrmModule.forFeature([Session, Transaction, CreditTransaction]),
    UserModule,
    MachineModule,
    CleaningModule,
  ],
  controllers: [BillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
