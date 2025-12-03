// src/search/search.module.ts

import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { YoutubeModule } from '../youtube/youtube.module';
import { ContentModule } from '../content/content.module';
import { NewsModule } from '../news/news.module';
import { QuranModule } from '../quran/quran.module'; // --- [NEW] IMPORT QURAN MODULE ---

@Module({
  imports: [
    // Import the modules that contain the services we need to use.
    YoutubeModule,
    ContentModule,
    NewsModule,
    QuranModule, // --- [NEW] ADD QURAN MODULE HERE ---
  ],
  controllers: [SearchController],
  providers: [SearchService],
})
export class SearchModule {}