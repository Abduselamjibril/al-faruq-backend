// src/purchase/entities/pending-transaction.entity.ts

import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';

@Entity()
export class PendingTransaction extends BaseEntity {
  // We use the tx_ref as the primary key because it's guaranteed to be unique
  @PrimaryColumn({ type: 'varchar' })
  tx_ref: string;

  @Column({ type: 'integer' })
  durationDays: number;

  // --- [CHANGE 1 START] ---
  // Add userId to store which user is making the purchase.
  @Column({ type: 'integer' })
  userId: number;

  // Add contentId to store which content is being purchased.
  @Column({ type: 'uuid' })
  contentId: string;
  // --- [CHANGE 1 END] ---

  // This helps with cleanup. We can have a background job that cleans up
  // any pending transactions older than a few hours that never completed.
  @CreateDateColumn()
  @Index({ expireAfterSeconds: 86400 }) // Optional: MongoDB-style TTL index if your DB supports it. For PG, this is just a comment.
  createdAt: Date;
}