import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, nullable: true, unique: true })
  openid: string;

  @Column({ length: 15, nullable: true, unique: true })
  phone: string;

  @Column({ length: 50 })
  nickname: string;

  @Column({ length: 255, nullable: true })
  avatar: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'bonus_balance', default: 0 })
  bonusBalance: number;

  @Column({ type: 'int', default: 0 })
  credits: number;

  @Column({ length: 20, name: 'member_level', default: 'normal' })
  memberLevel: string; // normal/silver/gold/diamond

  @Column({ type: 'int', name: 'total_spent', default: 0 })
  totalSpent: number;

  @Column({ type: 'int', name: 'total_hours', default: 0 })
  totalHours: number;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
