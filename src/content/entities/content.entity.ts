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
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PricingTier } from '../../pricing/entities/pricing-tier.entity';
import { Purchase } from '../../purchase/entities/purchase.entity';
import { AudioTrack } from './audio-track.entity';

export enum ContentType {
  MOVIE = 'MOVIE',
  MUSIC_VIDEO = 'MUSIC_VIDEO',
  SERIES = 'SERIES',
  SEASON = 'SEASON',
  EPISODE = 'EPISODE',
  QURAN_TAFSIR = 'QURAN_TAFSIR',
  DAWAH = 'DAWAH',
  DOCUMENTARY = 'DOCUMENTARY',
  PROPHET_HISTORY = 'PROPHET_HISTORY',
  PROPHET_HISTORY_EPISODE = 'PROPHET_HISTORY_EPISODE',
  // --- [NEW] ADDED BOOK TYPE ---
  BOOK = 'BOOK',
}

@Entity()
export class Content extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', nullable: true })
  thumbnailUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  videoUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  audioUrl: string | null;
  
  // --- [NEW] ADDED PDFURL FIELD FOR BOOKS ---
  @Column({ type: 'varchar', nullable: true })
  pdfUrl: string | null;

  @Column({ type: 'varchar', nullable: true })
  trailerUrl: string | null;

  @Column({ type: 'text', nullable: true, comment: 'Comma-separated tags' })
  tags: string | null;

  @Column({ type: 'integer', nullable: true, comment: 'Duration in seconds' })
  duration: number | null;
  
  // --- [NEW] BOOK-SPECIFIC FIELDS START ---

  @Index() // Index authorName for faster searching
  @Column({ type: 'varchar', nullable: true })
  authorName: string | null;
  
  @Column({ type: 'text', nullable: true, comment: 'Longer description about the book' })
  about: string | null;

  @Index() // Index genre for faster searching/filtering
  @Column({ type: 'varchar', nullable: true })
  genre: string | null;

  @Column({ type: 'integer', nullable: true })
  pageSize: number | null;

  @Column({ type: 'integer', nullable: true })
  publicationYear: number | null;

  // --- [NEW] BOOK-SPECIFIC FIELDS END ---

  @Index()
  @Column({
    type: 'enum',
    enum: ContentType,
  })
  type: ContentType;

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

  @OneToOne(() => PricingTier, (pricingTier) => pricingTier.content, {
    cascade: true,
  })
  pricingTier: PricingTier | null;

  @OneToMany(() => Purchase, (purchase) => purchase.content)
  purchases: Purchase[];

  @OneToMany(() => AudioTrack, (audioTrack) => audioTrack.content)
  audioTracks: AudioTrack[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}