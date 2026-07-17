import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'machine_id', length: 20 })
  machineId: string;

  @Column({ type: 'datetime', name: 'start_time' })
  startTime: Date;

  @Column({ type: 'datetime', name: 'end_time', nullable: true })
  endTime: Date;

  @Column({ type: 'int', default: 0 })
  duration: number; // 分钟

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ length: 20, default: 'active' })
  status: string; // active/paused/completed/cancelled

  @Column({ type: 'datetime', name: 'paused_at', nullable: true })
  pausedAt: Date;

  @Column({ type: 'int', name: 'paused_duration', default: 0 })
  pausedDuration: number; // 暂停时长（分钟）

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
