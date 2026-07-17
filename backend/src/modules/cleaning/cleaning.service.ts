import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CleaningTask } from './cleaning-task.entity';
import { MachineService } from '../machine/machine.service';

@Injectable()
export class CleaningService {
  constructor(
    @InjectRepository(CleaningTask)
    private taskRepository: Repository<CleaningTask>,
    private machineService: MachineService,
  ) {}

  async findPendingTasks(): Promise<CleaningTask[]> {
    return this.taskRepository.find({
      where: { status: 'pending' },
      order: { createdAt: 'ASC' },
    });
  }

  async findCompletedTasks(): Promise<CleaningTask[]> {
    return this.taskRepository.find({
      where: { status: 'completed' },
      order: { completedAt: 'DESC' },
    });
  }

  async startCleaning(id: number, cleanerId: number): Promise<CleaningTask> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    task.status = 'in_progress';
    task.cleanerId = cleanerId;
    task.startedAt = new Date();

    await this.machineService.updateStatus(task.machineId, 'cleaning');

    return this.taskRepository.save(task);
  }

  async completeCleaning(id: number): Promise<CleaningTask> {
    const task = await this.taskRepository.findOne({ where: { id } });
    if (!task) {
      throw new NotFoundException('任务不存在');
    }

    const completedAt = new Date();
    const duration = Math.ceil(
      (completedAt.getTime() - task.startedAt.getTime()) / 1000
    );

    task.status = 'completed';
    task.completedAt = completedAt;
    task.duration = duration;

    await this.machineService.updateStatus(task.machineId, 'offline');

    return this.taskRepository.save(task);
  }

  async createTask(machineId: string): Promise<CleaningTask> {
    const task = this.taskRepository.create({
      machineId,
      status: 'pending',
      createdAt: new Date(),
    });

    return this.taskRepository.save(task);
  }
}
