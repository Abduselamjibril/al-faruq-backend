// src/purchase/entities/user-content-entitlement.entity.ts

import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AccessType } from '../../common/enums/access-type.enum';

export enum EntitlementSource {
  SUBSCRIPTION = 'SUBSCRIPTION',
  TOP_UP = 'TOP_UP',
  PROMOTION = 'PROMOTION',
  ADMIN = 'ADMIN',
}

export enum EntitlementContentScope {
  EPISODE = 'EPISODE',
  SEASON = 'SEASON',
  SERIES = 'SERIES',
  BOOK = 'BOOK',
  MOVIE = 'MOVIE',
}

@Entity()
@Index(['userId', 'contentId']) // This index is crucial for fast access checks
export class UserContentEntitlement extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: EntitlementContentScope,
  })
  contentType: EntitlementContentScope;

  @Index()
  @Column({ type: 'uuid' })
  contentId: string;

  @Column({
    type: 'enum',
    enum: AccessType,
  })
  accessType: AccessType;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  validFrom: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  validUntil: Date | null; // Null means permanent access

  @Column({
    type: 'enum',
    enum: EntitlementSource,
  })
  source: EntitlementSource;

  @Column({ type: 'uuid', nullable: true })
  purchaseId: string | null;

  @CreateDateColumn()
  createdAt: Date;
}