import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Machine } from '../machine/machine.entity';

@Entity('areas')
export class Area {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'price_per_hour' })
  pricePerHour: number;

  @Column({ length: 20, default: 'active' })
  status: string; // active/inactive/maintenance

  @Column({ type: 'int', name: 'sort_order', default: 0 })
  sortOrder: number;

  @OneToMany(() => Machine, (machine) => machine.area)
  machines: Machine[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
