import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('credit_transactions')
export class CreditTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ type: 'int' })
  amount: number; // 正数为获得，负数为消�?
  @Column({ length: 20 })
  type: string; // task_reward/exchange/checkin/referral

  @Column({ name: 'reference_id', length: 50, nullable: true })
  referenceId: string;

  @Column({ length: 200, nullable: true })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
