import { Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Request, ParseIntPipe, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { OrderService } from './order.service';
import { MENU } from './menu';
import { StaffGuard } from '../auth/staff.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { CreateOrderDto, UpdateOrderStatusDto } from './order.dto';

@ApiTags('订单管理')
@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'manager', 'cashier', 'customer')
@ApiBearerAuth()
export class OrderController {
  constructor(private orderService: OrderService) {}

  @Post()
  @ApiOperation({ summary: '创建订单' })
  create(@Body() data: CreateOrderDto, @Request() req) {
    return this.orderService.create(data, req.user);
  }

  @Get('requests/:requestId')
  @ApiOperation({ summary: '确认本人提交的订单请求结果；404不表示原请求一定失败' })
  result(@Param('requestId', new ParseUUIDPipe({ version: '4' })) requestId: string, @Request() req) {
    return this.orderService.getRequestResult(requestId, req.user);
  }

  @Get()
  @ApiOperation({ summary: '获取订单列表' })
  @ApiQuery({ name: 'status', required: false })
  findAll(@Request() req, @Query('status') status?: string) {
    return this.orderService.findAll(status, req.user.role === 'customer' ? req.user.id : undefined);
  }

  @Patch(':id/status')
  @UseGuards(StaffGuard)
  @Roles('admin', 'manager', 'cashier')
  @ApiOperation({ summary: '更新订单状态' })
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() data: UpdateOrderStatusDto) {
    return this.orderService.updateStatus(id, data.status);
  }
}

@Controller('menu')
export class MenuController {
  @Get()
  list() { return MENU; }
}
