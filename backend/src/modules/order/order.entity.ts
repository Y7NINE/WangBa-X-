import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('orders')
@Index('UQ_orders_request_id', ['requestId'], { unique: true })
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

  @Column({ name: 'request_id', type: 'varchar', length: 36, nullable: true })
  requestId: string;

  @Column({ name: 'request_fingerprint', type: 'varchar', length: 64, nullable: true })
  requestFingerprint: string;

  @Column({ name: 'created_by_id', type: 'int', nullable: true })
  createdById: number;

  @Column({ name: 'created_by_type', type: 'varchar', length: 10, nullable: true })
  createdByType: string; // customer/staff; namespaces cannot be interchanged

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
