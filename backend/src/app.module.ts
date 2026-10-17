import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { getDatabaseConfig } from './config/database.config';
import { AuthModule } from './modules/auth/auth.module';
import { MachineModule } from './modules/machine/machine.module';
import { AreaModule } from './modules/area/area.module';
import { FaultModule } from './modules/fault/fault.module';
import { BillingModule } from './modules/billing/billing.module';
import { UserModule } from './modules/user/user.module';
import { CleaningModule } from './modules/cleaning/cleaning.module';
import { ShiftModule } from './modules/shift/shift.module';
import { BountyModule } from './modules/bounty/bounty.module';
import { WakeupModule } from './modules/wakeup/wakeup.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SettingModule } from './modules/setting/setting.module';
import { OrderModule } from './modules/order/order.module';
import { EventsModule } from './common/gateway/events.module';

@Module({
  imports: [
    // 配置模块
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),

    // 数据库模块
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: getDatabaseConfig,
      inject: [ConfigService],
    }),

    // 定时任务模块
    ScheduleModule.forRoot(),

    // 业务模块
    AuthModule,
    MachineModule,
    AreaModule,
    FaultModule,
    BillingModule,
    UserModule,
    CleaningModule,
    ShiftModule,
    BountyModule,
    WakeupModule,
    AnalyticsModule,
    SettingModule,
    OrderModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
