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
// --- [REMOVED] The 'AudioTrack' import is no longer needed. ---
// Note: We are keeping the Language entity itself as it is used by the new Quran system.

@Entity()
export class Language extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string; // e.g., "English", "Amharic"

  @Column({ unique: true, length: 10 })
  code: string; // e.g., "en", "am"

  // --- [REMOVED] The 'audioTracks' relationship is no longer needed. ---

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}