import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderService } from './order.service';
import { OrderController, MenuController } from './order.controller';
import { Order } from './order.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Order])],
  controllers: [OrderController, MenuController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}
