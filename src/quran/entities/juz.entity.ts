// src/quran/entities/juz.entity.ts

import { BaseEntity, Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { Surah } from './surah.entity';

@Entity()
export class Juz extends BaseEntity {
  @PrimaryColumn({ type: 'integer' })
  id: number;

  @Column()
  name: string;

  @OneToMany(() => Surah, (surah) => surah.juz)
  surahs: Surah[];
}