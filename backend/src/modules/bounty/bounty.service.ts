import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BountyTask } from './bounty-task.entity';
import { UserTaskProgress } from './user-task-progress.entity';

@Injectable()
export class BountyService {
  constructor(
    @InjectRepository(BountyTask)
    private taskRepository: Repository<BountyTask>,
    @InjectRepository(UserTaskProgress)
    private progressRepository: Repository<UserTaskProgress>,
  ) {}

  async findAll(): Promise<BountyTask[]> {
    return this.taskRepository.find({
      where: { isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string): Promise<BountyTask> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException('任务不存在');
    }
    return task;
  }

  async getUserProgress(userId: number): Promise<UserTaskProgress[]> {
    return this.progressRepository.find({
      where: { userId },
    });
  }

  async claimReward(userId: number, taskId: string): Promise<UserTaskProgress> {
    const progress = await this.progressRepository.findOne({
      where: { userId, taskId, status: 'completed' },
    });
    
    if (!progress) {
      throw new NotFoundException('任务未完成或已领取');
    }

    // Conditional transition prevents two callers from claiming the same progress row.
    const result = await this.progressRepository.update(
      { id: progress.id, userId, status: 'completed' },
      { status: 'claimed', claimedAt: new Date() },
    );
    if (result.affected !== 1) throw new NotFoundException('任务未完成或已领取');
    return this.progressRepository.findOneByOrFail({ id: progress.id, userId });
  }
}
