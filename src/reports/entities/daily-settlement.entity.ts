// src/reports/entities/daily-settlement.entity.ts

import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SettlementStatus {
  COMPLETED = 'COMPLETED',
  PENDING = 'PENDING',
  FAILED = 'FAILED',
}

@Entity()
export class DailySettlement extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'date' })
  settlementDate: string; // YYYY-MM-DD format

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  totalRevenue: number;

  @Column({ type: 'integer' })
  totalTransactions: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  alFaruqShare: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  skylinkShare: number;

  @Column({
    type: 'enum',
    enum: SettlementStatus,
    default: SettlementStatus.PENDING,
  })
  status: SettlementStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}