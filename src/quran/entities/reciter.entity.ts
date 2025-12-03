// src/quran/entities/reciter.entity.ts

import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Tafsir } from './tafsir.entity';

@Entity()
export class Reciter extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ type: 'varchar' })
  imageUrl: string;

  @OneToMany(() => Tafsir, (tafsir) => tafsir.reciter)
  tafsirs: Tafsir[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}