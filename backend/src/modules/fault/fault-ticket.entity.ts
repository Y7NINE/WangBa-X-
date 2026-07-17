import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Machine } from '../machine/machine.entity';

@Entity('fault_tickets')
export class FaultTicket {
  @PrimaryColumn({ length: 30 })
  id: string; // T20240115-001

  @Column({ name: 'machine_id', length: 20 })
  machineId: string;

  @Column({ name: 'fault_type', length: 50 })
  faultType: string;

  @Column({ name: 'fault_category', length: 20 })
  faultCategory: string; // hardware/software/network/peripheral

  @Column({ length: 20 })
  source: string; // auto_detect/player_report/staff_report

  @Column({ length: 5 })
  priority: string; // P0/P1/P2/P3

  @Column({ length: 20 })
  status: string; // pending/accepted/processing/transferred/resolved/cancelled/escalated

  @Column({ name: 'reporter_id', nullable: true })
  reporterId: number;

  @Column({ name: 'reporter_type', length: 10, nullable: true })
  reporterType: string; // player/staff

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'player_action', length: 20, nullable: true })
  playerAction: string; // wait_repair/request_change

  @Column({ name: 'handler_id', nullable: true })
  handlerId: number;

  @Column({ type: 'datetime', name: 'accepted_at', nullable: true })
  acceptedAt: Date;

  @Column({ type: 'datetime', name: 'resolved_at', nullable: true })
  resolvedAt: Date;

  @Column({ length: 50, nullable: true })
  resolution: string;

  @Column({ name: 'resolution_note', type: 'text', nullable: true })
  resolutionNote: string;

  @Column({ name: 'new_machine_id', length: 20, nullable: true })
  newMachineId: string;

  @Column({ type: 'datetime', name: 'transferred_at', nullable: true })
  transferredAt: Date;

  @Column({ type: 'datetime', name: 'timeout_at', nullable: true })
  timeoutAt: Date;

  @Column({ default: false })
  escalated: boolean;

  @Column({ type: 'datetime', name: 'escalated_at', nullable: true })
  escalatedAt: Date;

  @ManyToOne(() => Machine)
  @JoinColumn({ name: 'machine_id' })
  machine: Machine;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
