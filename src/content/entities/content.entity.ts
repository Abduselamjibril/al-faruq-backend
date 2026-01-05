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
// --- [REMOVED] The 'PricingTier' import is no longer needed. ---
import { Purchase } from '../../purchase/entities/purchase.entity';

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

  // --- [REMOVED] The OneToOne relationship to PricingTier is now gone. ---

  @OneToMany(() => Purchase, (purchase) => purchase.content)
  purchases: Purchase[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}