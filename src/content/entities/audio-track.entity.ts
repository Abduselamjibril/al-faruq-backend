// src/content/entities/audio-track.entity.ts

import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Content } from './content.entity';
import { Language } from './language.entity';

@Entity()
export class AudioTrack extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  audioUrl: string;

  @Column({ type: 'integer', nullable: true, comment: 'Duration in seconds' })
  duration: number | null;

  @ManyToOne(() => Content, (content) => content.audioTracks, {
    onDelete: 'CASCADE', // If the parent Tafsir is deleted, delete this track too.
  })
  @JoinColumn({ name: 'contentId' })
  content: Content;

  @Column()
  contentId: string;

  @ManyToOne(() => Language, (language) => language.audioTracks, {
    onDelete: 'SET NULL', // If a language is deleted, don't delete the track, just orphan it.
    nullable: true,
  })
  @JoinColumn({ name: 'languageId' })
  language: Language;

  @Column({ nullable: true })
  languageId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}