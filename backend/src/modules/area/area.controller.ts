import { Controller, Get, Post, Put, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AreaService } from './area.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('区域管理')
@Controller('areas')
export class AreaController {
  constructor(private areaService: AreaService) {}

  @Get()
  @ApiOperation({ summary: '获取所有区域（公开）' })
  findAll() {
    return this.areaService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取区域详情（公开）' })
  findOne(@Param('id') id: number) {
    return this.areaService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '创建区域（需认证）' })
  create(@Body() data: any) {
    return this.areaService.create(data);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '更新区域（需认证）' })
  update(@Param('id') id: number, @Body() data: any) {
    return this.areaService.update(id, data);
  }
}
