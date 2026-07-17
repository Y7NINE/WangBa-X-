import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Session } from './session.entity';
import { Transaction } from './transaction.entity';
import { UserService } from '../user/user.service';
import { MachineService } from '../machine/machine.service';
import { CleaningService } from '../cleaning/cleaning.service';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Session)
    private sessionRepository: Repository<Session>,
    @InjectRepository(Transaction)
    private transactionRepository: Repository<Transaction>,
    private userService: UserService,
    private machineService: MachineService,
    private cleaningService: CleaningService,
  ) {}

  async getActiveSessions(): Promise<Session[]> {
    return this.sessionRepository.find({
      where: { status: 'active' },
      order: { startTime: 'DESC' },
    });
  }

  async startSession(userId: number, machineId: string): Promise<Session> {
    // 检查用户是否有活跃会话
    const existingSession = await this.sessionRepository.findOne({
      where: { userId, status: 'active' },
    });
    if (existingSession) {
      throw new BadRequestException('用户已有活跃会话');
    }

    // 检查机器是否可用
    const machine = await this.machineService.findOne(machineId);
    if (machine.status !== 'offline') {
      throw new BadRequestException('机器不可用');
    }

    const session = this.sessionRepository.create({
      userId,
      machineId,
      startTime: new Date(),
      status: 'active',
    });

    // 更新机器状态
    await this.machineService.updateStatus(machineId, 'online');

    return this.sessionRepository.save(session);
  }

  async endSession(id: number): Promise<Session> {
    const session = await this.sessionRepository.findOne({ where: { id } });
    if (!session) {
      throw new NotFoundException('会话不存在');
    }

    if (session.status !== 'active') {
      throw new BadRequestException('会话已结束');
    }

    const endTime = new Date();
    const duration = Math.ceil(
      (endTime.getTime() - session.startTime.getTime()) / 60000
    );
    
    // 计算费用（简化版，实际需要根据计费策略）
    const amount = Math.ceil(duration / 60) * 10; // 每小时10元

    session.endTime = endTime;
    session.duration = duration;
    session.amount = amount;
    session.status = 'completed';

    // 更新机器状态为待清理
    await this.machineService.updateStatus(session.machineId, 'dirty');
    
    // 自动创建保洁任务
    await this.cleaningService.createTask(session.machineId);

    return this.sessionRepository.save(session);
  }

  async pauseSession(id: number): Promise<Session> {
    const session = await this.sessionRepository.findOne({ where: { id } });
    if (!session || session.status !== 'active') {
      throw new BadRequestException('会话状态不允许暂停');
    }

    session.status = 'paused';
    session.pausedAt = new Date();

    return this.sessionRepository.save(session);
  }

  async resumeSession(id: number): Promise<Session> {
    const session = await this.sessionRepository.findOne({ where: { id } });
    if (!session || session.status !== 'paused') {
      throw new BadRequestException('会话状态不允许恢复');
    }

    const pausedDuration = Math.ceil(
      (new Date().getTime() - session.pausedAt.getTime()) / 60000
    );
    session.pausedDuration += pausedDuration;
    session.status = 'active';
    session.pausedAt = null as any;

    return this.sessionRepository.save(session);
  }

  async getTransactions(userId?: number, type?: string): Promise<Transaction[]> {
    const where: any = {};
    if (userId) where.userId = userId;
    if (type) where.type = type;

    return this.transactionRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  async recharge(userId: number, amount: number, paymentMethod: string): Promise<Transaction> {
    const user = await this.userService.findById(userId);
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const balanceAfter = Number(user.balance) + amount;

    // 更新用户余额
    await this.userService.updateBalance(userId, balanceAfter);

    // 创建交易记录
    const transaction = this.transactionRepository.create({
      userId,
      type: 'recharge',
      amount,
      balanceAfter,
      paymentMethod,
      description: `充值 ¥${amount}`,
    });

    return this.transactionRepository.save(transaction);
  }
}
