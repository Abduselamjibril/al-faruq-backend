// src/quran/entities/surah.entity.ts

import {
  BaseEntity,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryColumn,
} from 'typeorm';
import { Juz } from './juz.entity';
import { Tafsir } from './tafsir.entity';

@Entity()
export class Surah extends BaseEntity {
  @PrimaryColumn({ type: 'integer' })
  id: number;

  @Column()
  name: string;

  @Column({ type: 'integer' })
  juzId: number;

  @ManyToOne(() => Juz, (juz) => juz.surahs)
  @JoinColumn({ name: 'juzId' })
  juz: Juz;

  @OneToMany(() => Tafsir, (tafsir) => tafsir.surah)
  tafsirs: Tafsir[];
}