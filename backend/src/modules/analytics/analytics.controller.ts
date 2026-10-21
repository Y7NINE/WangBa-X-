import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { StaffGuard } from '../auth/staff.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';

@ApiTags('数据统计')
@Controller('analytics')
@UseGuards(JwtAuthGuard, StaffGuard)
@Roles('admin', 'manager', 'cashier')
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('overview')
  @ApiOperation({ summary: '总览统计' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getOverview(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getOverview(from, to);
  }

  @Get('machines')
  @ApiOperation({ summary: '按机器统计' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getMachines(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getMachineStats(from, to);
  }

  @Get('areas')
  @ApiOperation({ summary: '按区域统计' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getAreas(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getAreaStats(from, to);
  }

  @Get('hourly')
  @ApiOperation({ summary: '按时段统计' })
  @ApiQuery({ name: 'date', required: false })
  getHourly(@Query('date') date?: string) {
    return this.analyticsService.getHourly(date);
  }

  @Get('faults')
  @ApiOperation({ summary: '故障统计' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getFaults(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getFaultStats(from, to);
  }
}
