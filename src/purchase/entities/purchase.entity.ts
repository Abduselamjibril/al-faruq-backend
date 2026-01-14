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

export enum PaymentType {
  SUBSCRIPTION = 'SUBSCRIPTION',
  TOP_UP = 'TOP_UP',
  UNLOCK = 'UNLOCK',
}

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
  @JoinColumn({ name: 'contentId' })
  content: Content;

  @Column({
    type: 'enum',
    enum: PaymentType,
    default: PaymentType.UNLOCK,
  })
  paymentType: PaymentType;

  @Column({
    type: 'enum',
    enum: ContentScope,
    nullable: true,
  })
  contentScope: ContentScope | null;

  @Column({ type: 'uuid', nullable: true })
  purchasedContentId: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  expiresAt: Date | null;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    comment: 'The base price of the content before VAT.',
  })
  baseAmount: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    comment: 'The VAT amount for this transaction.',
  })
  vatAmount: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    comment: 'The transaction fee charged by the payment gateway (Chapa).',
  })
  transactionFee: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    comment: 'The final total amount charged to the customer (base + VAT).',
  })
  grossAmount: number;

  @Column({
    type: 'decimal',
    precision: 12,
    scale: 2,
    comment:
      'The amount available for revenue splitting (gross - fee - VAT).',
  })
  netAmountForSplit: number;

  @Column({ unique: true })
  chapaTransactionId: string;

  @CreateDateColumn()
  createdAt: Date;
}