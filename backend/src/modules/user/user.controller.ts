import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { User } from './user.entity';
import { StaffGuard } from '../auth/staff.guard';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('用户管理')
@Controller('users')
@UseGuards(JwtAuthGuard, StaffGuard)
@ApiBearerAuth()
export class UserController {
  constructor(private userService: UserService) {}

  @Get()
  @ApiOperation({ summary: '获取所有用户' })
  findAll() {
    return this.userService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '获取用户详情' })
  findOne(@Param('id') id: number) {
    return this.userService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: '创建用户' })
  create(@Body() body: Partial<User>) {
    return this.userService.create(body);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新用户' })
  async update(@Param('id') id: number, @Body() body: Partial<User>) {
    await this.userService.findById(id);
    return this.userService.update(id, body);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除用户' })
  async remove(@Param('id') id: number) {
    await this.userService.remove(id);
    return { success: true };
  }
}
