import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('wake_up_configs')
export class WakeUpConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'machine_id', length: 20 })
  machineId: string;

  @Column({ type: 'time', name: 'wake_time' })
  wakeTime: string;

  @Column({ default: true })
  headphone: boolean;

  @Column({ name: 'light_strip', default: true })
  lightStrip: boolean;

  @Column({ default: true })
  screen: boolean;

  @Column({ name: 'human_wake', default: false })
  humanWake: boolean;

  @Column({ name: 'snooze_interval', default: 5 })
  snoozeInterval: number;

  @Column({ name: 'max_snooze', default: 2 })
  maxSnooze: number;

  @Column({ length: 20, default: 'scheduled' })
  status: string; // scheduled/active/completed/cancelled

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
