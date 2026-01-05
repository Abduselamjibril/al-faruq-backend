// src/purchase/entities/pending-transaction.entity.ts

import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import {
  EntitlementAccessType,
  EntitlementContentScope,
} from './user-content-entitlement.entity';
import { PaymentType } from './purchase.entity';

@Entity()
export class PendingTransaction extends BaseEntity {
  @PrimaryColumn({ type: 'varchar' })
  tx_ref: string;

  // --- [DEPRECATED but kept for now] Will be null for permanent unlocks ---
  @Column({ type: 'integer', nullable: true })
  durationDays: number | null;

  @Column({ type: 'integer' })
  userId: number;

  @Column({ type: 'uuid' })
  contentId: string;

  // --- [NEW] Fields to map directly to an entitlement ---
  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.UNLOCK,
  })
  paymentType: PaymentType;

  @Column({
    type: 'enum',
    enum: EntitlementContentScope,
  })
  contentScope: EntitlementContentScope;

  @Column({
    type: 'enum',
    enum: EntitlementAccessType,
  })
  accessType: EntitlementAccessType;
  // --- [NEW] End of new fields ---

  @CreateDateColumn()
  @Index({ expireAfterSeconds: 86400 })
  createdAt: Date;
}