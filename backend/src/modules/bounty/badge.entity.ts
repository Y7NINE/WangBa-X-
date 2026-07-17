import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('badges')
export class Badge {
  @PrimaryColumn({ length: 50 })
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 20 })
  icon: string;

  @Column({ length: 20 })
  rarity: string; // common/rare/epic/legendary

  @Column({ name: 'border_color', length: 20, nullable: true })
  borderColor: string;

  @Column({ length: 50, nullable: true })
  animation: string;

  @Column({ type: 'text' })
  conditions: any;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
