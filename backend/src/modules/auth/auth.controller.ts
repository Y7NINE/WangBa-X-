import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { StaffGuard } from './staff.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('认证授权')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @ApiOperation({ summary: '员工登录' })
  async login(@Body() loginDto: { username: string; password: string }) {
    return this.authService.login(loginDto.username, loginDto.password);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, StaffGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前员工信息' })
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.sub);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '退出登录' })
  async logout() {
    return { message: '退出成功' };
  }

  @Post('customer/login')
  @ApiOperation({ summary: '顾客手机号登录' })
  async customerLogin(@Body() dto: { phone: string; code?: string }) {
    return this.authService.customerLogin(dto.phone, dto.code);
  }

  @Get('customer/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '获取当前顾客信息' })
  async customerProfile(@Request() req) {
    if (req.user.role !== 'customer') throw new UnauthorizedException('请使用顾客账号');
    return this.authService.customerProfile(req.user.sub ?? req.user.id);
  }

  @Post('customer/logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '顾客退出登录' })
  async customerLogout() {
    return { message: '退出成功' };
  }
}
