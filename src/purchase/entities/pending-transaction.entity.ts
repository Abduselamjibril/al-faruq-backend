// src/purchase/entities/pending-transaction.entity.ts

import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
} from 'typeorm';
import { EntitlementContentScope } from './user-content-entitlement.entity';
import { PaymentType } from './purchase.entity';
import { AccessType } from '../../common/enums/access-type.enum';

@Entity()
export class PendingTransaction extends BaseEntity {
  @PrimaryColumn({ type: 'varchar' })
  tx_ref: string;

  @Column({ type: 'integer', nullable: true })
  durationDays: number | null;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'uuid' })
  contentId: string;

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
    enum: AccessType,
  })
  accessType: AccessType;

  @CreateDateColumn()
  @Index({ expireAfterSeconds: 86400 })
  createdAt: Date;
}