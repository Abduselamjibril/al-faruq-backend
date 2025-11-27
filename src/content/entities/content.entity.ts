// src/content/entities/content.entity.ts

import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index, // Import Index
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PricingTier } from '../../pricing/entities/pricing-tier.entity';
import { Purchase } from '../../purchase/entities/purchase.entity';

export enum ContentType {
  MOVIE = 'MOVIE',
  MUSIC_VIDEO = 'MUSIC_VIDEO',
  SERIES = 'SERIES',
  SEASON = 'SEASON',
  EPISODE = 'EPISODE',
}

@Entity()
export class Content extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true }) // --- CHANGED: Explicitly set type to 'varchar'
  thumbnailUrl: string | null;

  @Column({ type: 'varchar', nullable: true }) // --- CHANGED: Explicitly set type to 'varchar'
  videoUrl: string | null;

  @Column({ type: 'varchar', nullable: true }) // --- CHANGED: Explicitly set type to 'varchar'
  trailerUrl: string | null;

  @Column({ type: 'integer', nullable: true, comment: 'Duration in seconds' })
  duration: number | null;

  @Index() // Index this for quick filtering of content types
  @Column({
    type: 'enum',
    enum: ContentType,
  })
  type: ContentType;

  @Index() // Index this to quickly find all locked/unlocked content
  @Column({ default: false })
  isLocked: boolean;

  @Index() // Crucial index for fetching children of a parent
  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Content, (content) => content.children, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId' })
  parent: Content | null;

  @OneToMany(() => Content, (content) => content.parent)
  children: Content[];

  @OneToOne(() => PricingTier, (pricingTier) => pricingTier.content, {
    cascade: true,
  })
  pricingTier: PricingTier | null;

  @OneToMany(() => Purchase, (purchase) => purchase.content)
  purchases: Purchase[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}