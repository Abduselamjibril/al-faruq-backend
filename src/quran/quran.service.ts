// src/quran/quran.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from '../content/entities/language.entity';
import { Juz } from './entities/juz.entity';
import { Reciter } from './entities/reciter.entity';
import { Surah } from './entities/surah.entity';
import { Tafsir } from './entities/tafsir.entity';

// Define the shape of the response for recitations of a surah
export interface RecitationsByReciter {
  reciter: Reciter;
  recitations: Tafsir[];
}

export interface RecitationsBySurah {
  surah: Surah;
  recitations: Tafsir[];
}

// --- [NEW] DEFINE THE SHAPE FOR THE QURAN SEARCH RESULT ---
export interface QuranSearchResult {
  surahs: Surah[];
  reciters: Reciter[];
}

@Injectable()
export class QuranService {
  constructor(
    @InjectRepository(Juz)
    private readonly juzRepository: Repository<Juz>,
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
    @InjectRepository(Reciter)
    private readonly reciterRepository: Repository<Reciter>,
    @InjectRepository(Tafsir)
    private readonly tafsirRepository: Repository<Tafsir>,
    @InjectRepository(Surah)
    private readonly surahRepository: Repository<Surah>,
  ) {}

  /**
   * Fetches the entire Quran structure (Juz' and their nested Surahs).
   * This is ideal for the client to fetch once and cache.
   */
  async getQuranStructure(): Promise<Juz[]> {
    return this.juzRepository.find({
      relations: ['surahs'],
      order: { id: 'ASC', surahs: { id: 'ASC' } },
    });
  }

  /**
   * Fetches a list of all languages that have at least one tafsir/recitation.
   */
  async getAvailableLanguages(): Promise<Language[]> {
    const qb = this.languageRepository.createQueryBuilder('language');
    qb.innerJoin(Tafsir, 'tafsir', 'tafsir.languageId = language.id')
      .select('language')
      .distinct(true);

    return qb.getMany();
  }

  /**
   * Fetches a list of reciters, optionally filtered by language.
   * If filtered, it only returns reciters who have content in that language.
   */
  async getReciters(languageId?: string): Promise<Reciter[]> {
    if (languageId) {
      // If a languageId is provided, find reciters who have tafsirs in that language
      const qb = this.reciterRepository.createQueryBuilder('reciter');
      qb.innerJoin(Tafsir, 'tafsir', 'tafsir.reciterId = reciter.id')
        .where('tafsir.languageId = :languageId', { languageId })
        .select('reciter')
        .distinct(true)
        .orderBy('reciter.name', 'ASC');

      return qb.getMany();
    } else {
      // If no languageId is provided, return all reciters
      return this.reciterRepository.find({
        order: { name: 'ASC' },
      });
    }
  }

  /**
   * Fetches all recitations for a specific Surah, filtered by language,
   * and groups them by reciter.
   */
  async getRecitationsForSurah(
    surahId: number,
    languageId: string,
  ): Promise<RecitationsByReciter[]> {
    const tafsirs = await this.tafsirRepository.find({
      where: {
        surahId,
        languageId,
      },
      relations: ['reciter'],
      order: { createdAt: 'ASC' },
    });

    if (!tafsirs.length) {
      return [];
    }

    const groupedByReciter = tafsirs.reduce((acc, tafsir) => {
      const reciterId = tafsir.reciter.id;
      if (!acc[reciterId]) {
        acc[reciterId] = {
          reciter: tafsir.reciter,
          recitations: [],
        };
      }
      acc[reciterId].recitations.push(tafsir);
      return acc;
    }, {});

    return Object.values(groupedByReciter);
  }

  /**
   * Fetches all recitations for a specific Reciter, filtered by language,
   * and groups them by Surah.
   */
  async getRecitationsForReciter(
    reciterId: string,
    languageId: string,
  ): Promise<RecitationsBySurah[]> {
    const tafsirs = await this.tafsirRepository.find({
      where: {
        reciterId,
        languageId,
      },
      relations: ['surah'],
      order: { surahId: 'ASC', createdAt: 'ASC' },
    });

    if (!tafsirs.length) {
      return [];
    }

    const groupedBySurah = tafsirs.reduce((acc, tafsir) => {
      const surahId = tafsir.surah.id;
      if (!acc[surahId]) {
        acc[surahId] = {
          surah: tafsir.surah,
          recitations: [],
        };
      }
      acc[surahId].recitations.push(tafsir);
      return acc;
    }, {});

    return Object.values(groupedBySurah);
  }

  // --- [NEW] METHOD TO SEARCH FOR SURAHS AND RECITERS ---
  /**
   * Searches for surahs and reciters by name.
   * @param query The search term.
   * @returns An object containing arrays of matching surahs and reciters.
   */
  async searchQuran(query: string): Promise<QuranSearchResult> {
    const searchTerm = `%${query}%`;

    const surahsQuery = this.surahRepository
      .createQueryBuilder('surah')
      .where('surah.name ILIKE :searchTerm', { searchTerm })
      .orderBy('surah.id', 'ASC')
      .getMany();

    const recitersQuery = this.reciterRepository
      .createQueryBuilder('reciter')
      .where('reciter.name ILIKE :searchTerm', { searchTerm })
      .orderBy('reciter.name', 'ASC')
      .getMany();

    const [surahs, reciters] = await Promise.all([surahsQuery, recitersQuery]);

    return { surahs, reciters };
  }
}