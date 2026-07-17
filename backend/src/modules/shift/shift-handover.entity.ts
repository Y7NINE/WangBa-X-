import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('shift_handovers')
export class ShiftHandover {
  @PrimaryColumn({ length: 30 })
  id: string; // 20240115-001

  @Column({ name: 'outgoing_staff_id' })
  outgoingStaffId: number;

  @Column({ name: 'incoming_staff_id' })
  incomingStaffId: number;

  @Column({ name: 'shift_type', length: 10 })
  shiftType: string; // morning/afternoon/night

  @Column({ type: 'datetime', name: 'handover_time' })
  handoverTime: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'expected_cash', nullable: true })
  expectedCash: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'actual_cash', nullable: true })
  actualCash: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'cash_difference', nullable: true })
  cashDifference: number;

  @Column({ name: 'cash_status', length: 20 })
  cashStatus: string; // normal/abnormal

  @Column({ name: 'inventory_status', length: 20 })
  inventoryStatus: string; // normal/abnormal

  @Column({ type: 'text', name: 'inventory_details', nullable: true })
  inventoryDetails: any;

  @Column({ length: 20, default: 'pending' })
  status: string; // pending/locked/resolved

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'resolved_by', nullable: true })
  resolvedBy: number;

  @Column({ type: 'datetime', name: 'resolved_at', nullable: true })
  resolvedAt: Date;

  @Column({ name: 'resolution_notes', type: 'text', nullable: true })
  resolutionNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
