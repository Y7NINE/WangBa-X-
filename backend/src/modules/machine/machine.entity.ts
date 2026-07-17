import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Area } from '../area/area.entity';

@Entity('machines')
export class Machine {
  @PrimaryColumn({ length: 20 })
  id: string; // å¦?A-01, B-05

  @Column({ name: 'area_id' })
  areaId: number;

  @Column({ type: 'float', name: 'position_x', nullable: true })
  positionX: number;

  @Column({ type: 'float', name: 'position_y', nullable: true })
  positionY: number;

  @Column({ length: 15, name: 'ip_address', nullable: true })
  ipAddress: string;

  @Column({ length: 17, name: 'mac_address', nullable: true })
  macAddress: string;

  @Column({ length: 20, default: 'offline' })
  status: string; // online/offline/fault/repairing/maintenance/dirty/cleaning

  @Column({ name: 'current_user_id', nullable: true })
  currentUserId: number;

  @Column({ name: 'session_id', nullable: true })
  sessionId: number;

  @Column({ type: 'datetime', name: 'last_heartbeat', nullable: true })
  lastHeartbeat: Date;

  @Column({ length: 50, name: 'fault_type', nullable: true })
  faultType: string;

  @Column({ type: 'datetime', name: 'fault_time', nullable: true })
  faultTime: Date;

  @ManyToOne(() => Area, (area) => area.machines)
  @JoinColumn({ name: 'area_id' })
  area: Area;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
