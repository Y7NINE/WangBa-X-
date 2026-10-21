import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { CreateUserDto, UpdateUserDto } from './user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findAll(): Promise<User[]> {
    return this.userRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }
    return user;
  }

  async findByPhone(phone: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { phone } });
  }

  async findByOpenid(openid: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { openid } });
  }

  private profileData(data: Partial<Pick<User, 'nickname' | 'phone' | 'avatar' | 'isActive'>>): Partial<User> {
    const profile: Partial<User> = {};
    for (const field of ['nickname', 'phone', 'avatar', 'isActive'] as const) {
      if (data[field] !== undefined) Object.assign(profile, { [field]: data[field] });
    }
    return profile;
  }

  async create(data: CreateUserDto): Promise<User> {
    const user = this.userRepository.create(this.profileData(data));
    return this.userRepository.save(user);
  }

  async update(id: number, data: UpdateUserDto): Promise<User> {
    const user = await this.findById(id);
    Object.assign(user, this.profileData(data));
    return this.userRepository.save(user);
  }

  async remove(id: number): Promise<void> {
    const user = await this.findById(id);
    await this.userRepository.remove(user);
  }

  async updateBalance(id: number, balance: number): Promise<void> {
    await this.userRepository.update(id, { balance });
  }

  async addCredits(id: number, credits: number): Promise<void> {
    const user = await this.findById(id);
    user.credits += credits;
    await this.userRepository.save(user);
  }

  async updateMemberLevel(id: number): Promise<void> {
    const user = await this.findById(id);

    if (user.totalSpent >= 10000) {
      user.memberLevel = 'diamond';
    } else if (user.totalSpent >= 5000) {
      user.memberLevel = 'gold';
    } else if (user.totalSpent >= 2000) {
      user.memberLevel = 'silver';
    } else {
      user.memberLevel = 'normal';
    }

    await this.userRepository.save(user);
  }
}
