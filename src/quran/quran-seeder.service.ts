// src/quran/quran-seeder.service.ts

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Juz } from './entities/juz.entity';
import { Surah } from './entities/surah.entity';
import { QURAN_STRUCTURE } from './data/quran.data';

@Injectable()
export class QuranSeederService implements OnModuleInit {
  private readonly logger = new Logger(QuranSeederService.name);

  constructor(
    @InjectRepository(Juz)
    private readonly juzRepository: Repository<Juz>,
    @InjectRepository(Surah)
    private readonly surahRepository: Repository<Surah>,
  ) {}

  async onModuleInit() {
    await this.seedQuranStructure();
  }

  public async seedQuranStructure() {
    this.logger.log('Checking if Quran structure needs to be seeded...');
    const juzCount = await this.juzRepository.count();

    if (juzCount === 0) {
      this.logger.log('Database is empty. Seeding Juz and Surah data...');
      try {
        // A map to keep track of surahs that have already been created
        // to avoid creating duplicate entries for surahs spanning multiple juz'
        const createdSurahs = new Map<number, Surah>();

        for (const juzData of QURAN_STRUCTURE) {
          // Create and save the Juz
          const newJuz = this.juzRepository.create({
            id: juzData.id,
            name: juzData.name,
          });
          await this.juzRepository.save(newJuz);

          for (const surahData of juzData.surahs) {
            // Check if the Surah has already been created
            if (!createdSurahs.has(surahData.id)) {
              const newSurah = this.surahRepository.create({
                id: surahData.id,
                name: surahData.name,
                juzId: newJuz.id, // Assign the juzId
              });
              const savedSurah = await this.surahRepository.save(newSurah);
              createdSurahs.set(savedSurah.id, savedSurah);
            }
          }
        }
        this.logger.log('Successfully seeded 30 Juz and 114 Surahs.');
      } catch (error) {
        this.logger.error('Failed to seed Quran structure.', error.stack);
      }
    } else {
      this.logger.log('Quran structure already exists in the database. Skipping seed.');
    }
  }
}
