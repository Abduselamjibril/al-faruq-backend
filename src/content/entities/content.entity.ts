// src/content/entities/content.entity.ts

import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Purchase } from '../../purchase/entities/purchase.entity';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentPricing } from './content-pricing.entity';
import { User } from '../../users/entities/user.entity';

export enum ContentType {
  MOVIE = 'MOVIE',
  MUSIC_VIDEO = 'MUSIC_VIDEO',
  SERIES = 'SERIES',
  SEASON = 'SEASON',
  EPISODE = 'EPISODE',
  DAWAH = 'DAWAH',
  DOCUMENTARY = 'DOCUMENTARY',
  PROPHET_HISTORY = 'PROPHET_HISTORY',
  PROPHET_HISTORY_EPISODE = 'PROPHET_HISTORY_EPISODE',
  BOOK = 'BOOK',
}

export enum ContentStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

// --- [NEW] ---
// Define the types for our new media structure.
export enum ContentMediaType {
  THUMBNAIL = 'THUMBNAIL',
  POSTER = 'POSTER',
}

export interface ContentMediaItem {
  url: string;
  type: ContentMediaType;
  isPrimary: boolean;
}
// --- [END NEW] ---

@Entity('content')
export class Content extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  thumbnailUrl: string | null;

  // --- [NEW] ---
  // This new 'jsonb' column will store our array of media items.
  @Column({
    type: 'jsonb',
    nullable: true,
    comment: 'Array of media items (thumbnails, posters)',
  })
  media: ContentMediaItem[] | null;
  // --- [END NEW] ---

  @Column({ type: 'varchar', nullable: true })
  videoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  youtubeUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  audioUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  pdfUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  trailerUrl: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Comma-separated tags' })
  tags: string | null;

  @Column({ type: 'integer', nullable: true, comment: 'Duration in seconds' })
  duration: number | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  authorName: string | null;

  @Column({
    type: 'text',
    nullable: true,
    comment: 'Longer description about the book',
  })
  about: string | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  genre: string | null;

  @Column({ type: 'integer', nullable: true })
  pageSize: number | null;

  @Column({ type: 'integer', nullable: true })
  publicationYear: number | null;

  @Index()
  @Column({
    type: 'enum',
    enum: ContentType,
  })
  type: ContentType;
  
  @Index()
  @Column({
    type: 'enum',
    enum: ContentStatus,
    default: ContentStatus.PUBLISHED,
  })
  status: ContentStatus;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date | null;
  
  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Index()
  @Column({ default: false })
  isLocked: boolean;

  @Index()
  @Column({ type: 'uuid', nullable: true })
  parentId: string | null;

  @ManyToOne(() => Content, (content) => content.children, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'parentId' })
  parent: Content | null;

  @OneToMany(() => Content, (content) => content.parent)
  children: Content[];

  @ManyToOne(() => User, (user) => user.createdContent, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @OneToMany(() => Purchase, (purchase) => purchase.content)
  purchases: Purchase[];

  @ApiPropertyOptional({
    description: 'Available pricing options if the content is locked and not owned by the user.',
    type: [ContentPricing],
  })
  pricingTiers?: ContentPricing[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}