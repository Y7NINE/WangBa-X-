import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('bounty_tasks')
export class BountyTask {
  @PrimaryColumn({ length: 50 })
  id: string;

  @Column({ length: 20 })
  type: string; // referral/resident/idle/consumption/checkin/game

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ name: 'reward_type', length: 20 })
  rewardType: string; // credit/time/coupon/badge

  @Column({ name: 'reward_amount' })
  rewardAmount: number;

  @Column({ name: 'max_completions', nullable: true })
  maxCompletions: number;

  @Column({ type: 'text' })
  conditions: any;

  @Column({ type: 'datetime', name: 'start_time', nullable: true })
  startTime: Date;

  @Column({ type: 'datetime', name: 'end_time', nullable: true })
  endTime: Date;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
