import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('cleaning_tasks')
export class CleaningTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'machine_id', length: 20 })
  machineId: string;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ name: 'cleaner_id', nullable: true })
  cleanerId: number;

  @Column({ type: 'datetime', name: 'created_at', nullable: true })
  createdAt: Date;

  @Column({ type: 'datetime', name: 'started_at', nullable: true })
  startedAt: Date;

  @Column({ type: 'datetime', name: 'completed_at', nullable: true })
  completedAt: Date;

  @Column({ name: 'completed_by', nullable: true })
  completedBy: number;

  @Column({ type: 'int', nullable: true })
  duration: number;
}
