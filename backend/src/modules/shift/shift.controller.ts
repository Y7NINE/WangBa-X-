import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShiftService } from './shift.service';
import { StaffGuard } from '../auth/staff.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('交接班')
@Controller('shifts')
@UseGuards(JwtAuthGuard, StaffGuard)
@Roles('admin', 'manager', 'cashier')
@ApiBearerAuth()
export class ShiftController {
  constructor(private shiftService: ShiftService) {}

  @Get()
  @ApiOperation({ summary: '获取交接班记录' })
  findAll() {
    return this.shiftService.findAll();
  }

  @Post()
  @ApiOperation({ summary: '发起交接班' })
  create(@Body() data: any, @Request() req) {
    return this.shiftService.create({ ...data, outgoingStaffId: req.user.id });
  }
}
