import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('staff')
export class Staff {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true })
  username: string;

  @Column({ length: 255 })
  password: string;

  @Column({ length: 50 })
  name: string;

  @Column({ length: 20 })
  role: string; // admin/cashier/technician/manager/cleaner

  @Column({ length: 15, nullable: true })
  phone: string;

  @Column({ length: 100, name: 'wechat_openid', nullable: true })
  wechatOpenid: string;

  @Column({ name: 'is_on_duty', default: false })
  isOnDuty: boolean;

  @Column({ name: 'current_area', nullable: true })
  currentArea: number;

  @Column({ name: 'max_tickets', default: 5 })
  maxTickets: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
