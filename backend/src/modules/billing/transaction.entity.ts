import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('transactions')
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ length: 20 })
  type: string; // recharge/consume/bonus/refund

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'balance_after' })
  balanceAfter: number;

  @Column({ length: 50, name: 'payment_method', nullable: true })
  paymentMethod: string; // cash/wechat/alipay/bonus

  @Column({ length: 100, name: 'reference_id', nullable: true })
  referenceId: string; // 会话ID、订单号�?
  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'operator_id', nullable: true })
  operatorId: number; // 操作员（收银员）

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
