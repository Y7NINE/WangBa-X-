import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('settings')
export class Setting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100, name: 'shop_name', default: '高端电竞馆' })
  shopName: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 10, name: 'open_time', default: '08:00' })
  openTime: string;

  @Column({ length: 10, name: 'close_time', default: '02:00' })
  closeTime: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'default_rate', default: 10 })
  defaultRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'night_rate', default: 30 })
  nightRate: number;

  @Column({ length: 10, name: 'night_start', default: '22:00' })
  nightStart: string;

  @Column({ length: 10, name: 'night_end', default: '08:00' })
  nightEnd: string;

  @Column({ type: 'int', name: 'heartbeat_timeout', default: 60 })
  heartbeatTimeout: number;

  @Column({ length: 100, name: 'notify_methods', default: 'popup,sound' })
  notifyMethods: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
