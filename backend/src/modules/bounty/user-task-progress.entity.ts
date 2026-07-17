import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('user_task_progress')
export class UserTaskProgress {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'task_id', length: 50 })
  taskId: string;

  @Column({ length: 20, default: 'in_progress' })
  status: string; // in_progress/completed/claimed

  @Column({ type: 'int', default: 0 })
  progress: number;

  @Column({ type: 'datetime', name: 'completed_at', nullable: true })
  completedAt: Date;

  @Column({ type: 'datetime', name: 'claimed_at', nullable: true })
  claimedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
