// src/quran/entities/tafsir.entity.ts

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
import { Language } from '../../content/entities/language.entity';
import { Reciter } from './reciter.entity';
import { Surah } from './surah.entity';

@Entity()
export class Tafsir extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  subtitle: string | null;

  @Column({ type: 'varchar' })
  audioUrl: string;

  @Column({ type: 'integer' })
  surahId: number;

  @ManyToOne(() => Surah, (surah) => surah.tafsirs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'surahId' })
  surah: Surah;

  @Column({ type: 'uuid' })
  reciterId: string;

  @ManyToOne(() => Reciter, (reciter) => reciter.tafsirs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reciterId' })
  reciter: Reciter;

  @Column({ type: 'uuid' })
  languageId: string;

  @ManyToOne(() => Language, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'languageId' })
  language: Language;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}