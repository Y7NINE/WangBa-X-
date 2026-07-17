import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('user_badges')
export class UserBadge {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'user_id' })
  userId: number;

  @Column({ name: 'badge_id', length: 50 })
  badgeId: string;

  @Column({ type: 'datetime', name: 'earned_at' })
  earnedAt: Date;

  @Column({ name: 'is_displayed', default: false })
  isDisplayed: boolean;
}
