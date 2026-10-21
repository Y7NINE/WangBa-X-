import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('transactions')
@Index('UQ_transactions_recharge_request_id', ['requestId'], { unique: true })
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
  referenceId: string; // 会话ID或订单编号
  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'operator_id', nullable: true })
  operatorId: number; // 操作员（收银员）

  @Column({ name: 'request_id', type: 'varchar', length: 36, nullable: true })
  requestId: string; // 充值请求编号；历史与非充值流水允许为空

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
