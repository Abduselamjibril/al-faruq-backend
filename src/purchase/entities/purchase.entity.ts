import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index, // Import Index
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Content } from '../../content/entities/content.entity';

@Entity()
// This composite index is VITAL for checking a user's access to a specific piece of content.
// It's the most important performance optimization for the access check logic.
@Index(['user', 'content', 'expiresAt'])
export class Purchase extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, (user) => user.purchases, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn()
  user: User;

  @ManyToOne(() => Content, (content) => content.purchases, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  content: Content;

  @Column({ type: 'timestamp with time zone' })
  expiresAt: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pricePaid: number;

  @Column({ unique: true })
  chapaTransactionId: string;

  @CreateDateColumn()
  createdAt: Date;
}