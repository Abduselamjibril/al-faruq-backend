// src/purchase/entities/purchase.entity.ts

import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Content } from '../../content/entities/content.entity';

// --- [NEW] ENUM for PaymentType ---
export enum PaymentType {
  SUBSCRIPTION = 'SUBSCRIPTION', // For blanket access (legacy or future)
  TOP_UP = 'TOP_UP', // A more generic term for adding value, can be used for unlocks
  UNLOCK = 'UNLOCK', // Specifically for single-item permanent purchases
}

// --- [NEW] ENUM for ContentScope ---
export enum ContentScope {
  EPISODE = 'EPISODE',
  SEASON = 'SEASON',
  SERIES = 'SERIES',
  BOOK = 'BOOK',
  MOVIE = 'MOVIE',
}

@Entity()
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
  @JoinColumn({ name: 'contentId' }) // Keep original content relationship for backward compatibility
  content: Content;

  // --- [NEW] Store the payment type ---
  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.SUBSCRIPTION,
  })
  paymentType: PaymentType;

  // --- [NEW] Store the scope of the purchase ---
  @Column({
    type: 'enum',
    enum: ContentScope,
    nullable: true, // Nullable for legacy data
  })
  contentScope: ContentScope | null;

  // --- [NEW] Store the specific content ID of the item unlocked ---
  // This is crucial for per-episode unlocks. `contentId` above might point to the Series.
  @Column({ type: 'uuid', nullable: true })
  purchasedContentId: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true }) // Made nullable for permanent unlocks
  expiresAt: Date | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  pricePaid: number;

  @Column({ unique: true })
  chapaTransactionId: string;

  @CreateDateColumn()
  createdAt: Date;
}