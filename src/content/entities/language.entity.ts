// src/content/entities/language.entity.ts

import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { AudioTrack } from './audio-track.entity';

@Entity()
export class Language extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // e.g., "English", "Amharic"

  @Column({ unique: true, length: 10 })
  code: string; // e.g., "en", "am"

  @OneToMany(() => AudioTrack, (audioTrack) => audioTrack.language)
  audioTracks: AudioTrack[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}