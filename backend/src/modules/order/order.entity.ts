import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id', nullable: true })
  userId: number;

  @Column({ name: 'machine_id', length: 20, nullable: true })
  machineId: string;

  @Column({ type: 'text', nullable: true })
  items: string; // JSON字符串 [{itemId,name,price,qty}]

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ length: 255, nullable: true })
  remark: string;

  @Column({ length: 20, default: 'pending' })
  status: string; // pending/preparing/delivering/completed/cancelled

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
