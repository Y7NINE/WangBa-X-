import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { MENU } from './menu';
import { StaffGuard } from '../auth/staff.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('订单管理')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: '创建订单' })
  create(@Body() data: any, @Request() req) {
    return this.orderService.create({ ...data, userId: req.user.role === 'customer' ? req.user.id : data.userId });
  }

  @Get()
  @ApiOperation({ summary: '获取订单列表' })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Request() req, @Query('status') status?: string) {
    return this.orderService.findAll(status, req.user.role === 'customer' ? req.user.id : undefined);
  }

  @Patch(':id/status')
  @UseGuards(StaffGuard)
  @ApiOperation({ summary: '更新订单状态' })
  updateStatus(@Param('id') id: number, @Body('status') status: string) {
    return this.orderService.updateStatus(id, status);
  }
}

@Controller('menu')
export class MenuController {
  @Get()
  list() { return MENU; }
}
