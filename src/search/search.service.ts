// src/search/search.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { SearchType } from './dto/search-query.dto';
import { YoutubeService } from '../youtube/youtube.service';
import { ContentService } from '../content/content.service';
import { YouTubeSearchResultDto } from '../youtube/youtube.service';
import { Content, ContentType } from '../content/entities/content.entity';
import { NewsService } from '../news/news.service';
import { News } from '../news/entities/news.entity';
import { QuranService, QuranSearchResult } from '../quran/quran.service'; // --- [NEW] IMPORT QURAN SERVICE AND RESULT TYPE ---

// --- [MODIFIED] Update the response structure to include quran results ---
export interface SearchResult {
  youtube: YouTubeSearchResultDto[];
  content: Content[];
  news: News[];
  quran: QuranSearchResult;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly contentService: ContentService,
    private readonly newsService: NewsService,
    private readonly quranService: QuranService, // --- [NEW] INJECT QURAN SERVICE ---
  ) {}

  async performSearch(
    query: string,
    type: SearchType,
  ): Promise<SearchResult> {
    this.logger.log(
      `Performing search for query="${query}" with type="${type}"`,
    );

    const topLevelTypes = [
      SearchType.MOVIE,
      SearchType.MUSIC_VIDEO,
      SearchType.SERIES,
      SearchType.DAWAH,
      SearchType.DOCUMENTARY,
      SearchType.PROPHET_HISTORY,
      SearchType.BOOK,
    ];

    // --- [MODIFIED] Initialize the full response structure ---
    const results: SearchResult = {
      youtube: [],
      content: [],
      news: [],
      quran: {
        surahs: [],
        reciters: [],
      },
    };

    try {
      if (type === SearchType.ALL) {
        const [
          youtubeResults,
          topLevelResults,
          episodeResults,
          newsResults,
          quranResults, // --- [NEW] Add quran to the 'ALL' search ---
        ] = await Promise.all([
          this.youtubeService.searchCachedPlaylist(query),
          this.contentService.searchTopLevelContent(query),
          this.contentService.searchEpisodes(query),
          this.newsService.search(query),
          this.quranService.searchQuran(query), // --- [NEW] Call the quran search method ---
        ]);
        results.youtube = youtubeResults;
        results.content = [...topLevelResults, ...episodeResults];
        results.news = newsResults;
        results.quran = quranResults;
      } else if (type === SearchType.YOUTUBE) {
        results.youtube = await this.youtubeService.searchCachedPlaylist(query);
      } else if (type === SearchType.NEWS) {
        results.news = await this.newsService.search(query);
      } else if (type === SearchType.QURAN) {
        // --- [NEW] Handle the specific QURAN search type ---
        results.quran = await this.quranService.searchQuran(query);
      } else if (type === SearchType.SURAH) {
        // --- [NEW] Handle the specific SURAH search type ---
        const quranResults = await this.quranService.searchQuran(query);
        results.quran.surahs = quranResults.surahs; // Only return surahs
      } else if (type === SearchType.EPISODES) {
        results.content = await this.contentService.searchEpisodes(query);
      } else if (topLevelTypes.includes(type)) {
        results.content = await this.contentService.searchTopLevelContent(
          query,
          type as unknown as ContentType,
        );
      }
    } catch (error) {
      this.logger.error(
        `Search failed for type ${type} with query "${query}"`,
        error.stack,
      );
      // --- [MODIFIED] Return a clean structure including quran on failure ---
      return {
        youtube: [],
        content: [],
        news: [],
        quran: { surahs: [], reciters: [] },
      };
    }

    return results;
  }
}