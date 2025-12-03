// src/quran/quran.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Language } from '../content/entities/language.entity';
import { AdminQuranController } from './admin-quran.controller';
import { AdminQuranService } from './admin-quran.service';
import { Juz } from './entities/juz.entity';
import { Reciter } from './entities/reciter.entity';
import { Surah } from './entities/surah.entity';
import { Tafsir } from './entities/tafsir.entity';
import { QuranController } from './quran.controller';
import { QuranService } from './quran.service';
import { QuranSeederService } from './quran-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Juz, Surah, Reciter, Tafsir, Language])],
  controllers: [QuranController, AdminQuranController],
  providers: [QuranService, AdminQuranService, QuranSeederService],
  // --- [NEW] EXPORT THE QURANSERVICE SO OTHER MODULES CAN USE IT ---
  exports: [QuranService],
})
export class QuranModule {}