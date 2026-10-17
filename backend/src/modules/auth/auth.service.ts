import { Injectable, UnauthorizedException, ServiceUnavailableException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Staff } from '../user/staff.entity';
import { User } from '../user/user.entity';

const DEV_CUSTOMER_CODE = '123456';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Staff)
    private staffRepository: Repository<Staff>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private jwtService: JwtService,
    private config: ConfigService,
  ) {}

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.staffRepository.findOne({ where: { username } });
    if (user && (await bcrypt.compare(password, user.password))) {
      const { password: _pwd, ...result } = user;
      return result;
    }
    return null;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const payload = { username: user.username, sub: user.id, role: user.role };
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
      },
    };
  }

  async getProfile(userId: number) {
    const staff = await this.staffRepository.findOne({ where: { id: userId } });
    if (!staff) throw new UnauthorizedException('员工不存在');
    const { password, ...profile } = staff;
    return profile;
  }

  /** 顾客手机号登录（dev 验证码固定 123456） */
  async customerLogin(phone: string, code?: string) {
    if (this.config.get('DEMO_MODE') !== 'true' || this.config.get('NODE_ENV') === 'production') {
      throw new ServiceUnavailableException('短信服务尚未接入，演示登录仅限本地仿真模式');
    }
    if (typeof phone !== 'string' || !/^1[3-9]\d{9}$/.test(phone)) {
      throw new BadRequestException('请输入有效的11位手机号');
    }
    if (code !== DEV_CUSTOMER_CODE) {
      throw new UnauthorizedException('验证码错误');
    }

    let user = await this.userRepository.findOne({ where: { phone } });
    if (!user) {
      user = this.userRepository.create({
        phone,
        nickname: `用户${phone.slice(-4)}`,
        balance: 0,
        credits: 0,
        memberLevel: 'normal',
      });
      user = await this.userRepository.save(user);
    }

    const payload = { sub: user.id, phone: user.phone, role: 'customer' };
    return {
      token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        avatar: user.avatar,
        balance: user.balance,
        credits: user.credits,
        memberLevel: user.memberLevel,
      },
    };
  }

  async customerProfile(userId: number) {
    return this.userRepository.findOne({ where: { id: userId } });
  }
}
