import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('fault_types')
export class FaultType {
  @PrimaryColumn({ length: 50 })
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 20 })
  category: string; // hardware/software/network/peripheral

  @Column({ name: 'default_priority', length: 5 })
  defaultPriority: string;

  @Column({ name: 'timeout_minutes' })
  timeoutMinutes: number;

  @Column({ length: 50, nullable: true })
  icon: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
