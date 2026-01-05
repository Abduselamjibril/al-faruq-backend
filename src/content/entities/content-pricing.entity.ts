// src/content/entities/content-pricing.entity.ts

import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum ContentPricingScope {
  EPISODE = 'EPISODE',
  SEASON = 'SEASON',
  SERIES = 'SERIES',
  BOOK = 'BOOK',
  MOVIE = 'MOVIE',
}

@Entity()
@Index(['contentType', 'contentId'], { unique: true }) // A content item can only have one price record
export class ContentPricing extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: ContentPricingScope,
  })
  contentType: ContentPricingScope;

  @Index()
  @Column({ type: 'uuid' })
  contentId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @Column({ type: 'varchar', length: 10, default: 'ETB' })
  currency: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}