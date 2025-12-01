// src/search/search.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { SearchType } from './dto/search-query.dto';
import { YoutubeService } from '../youtube/youtube.service';
import { ContentService } from '../content/content.service';
import { YouTubeSearchResultDto } from '../youtube/youtube.service';
import { Content, ContentType } from '../content/entities/content.entity';
import { NewsService } from '../news/news.service'; // --- [NEW] IMPORT NEWS SERVICE ---
import { News } from '../news/entities/news.entity'; // --- [NEW] IMPORT NEWS ENTITY ---

// --- [MODIFIED] Update the response structure to include news ---
export interface SearchResult {
  youtube: YouTubeSearchResultDto[];
  content: Content[];
  news: News[];
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly contentService: ContentService,
    private readonly newsService: NewsService, // --- [NEW] INJECT NEWS SERVICE ---
  ) {}

  async performSearch(
    query: string,
    type: SearchType,
  ): Promise<SearchResult> {
    this.logger.log(`Performing search for query="${query}" with type="${type}"`);

    const topLevelTypes = [
      SearchType.MOVIE,
      SearchType.MUSIC_VIDEO,
      SearchType.SERIES,
      SearchType.DAWAH,
      SearchType.DOCUMENTARY,
      SearchType.PROPHET_HISTORY,
      SearchType.BOOK,
    ];

    // Initialize the response structure
    const results: SearchResult = {
      youtube: [],
      content: [],
      news: [],
    };

    try {
      if (type === SearchType.ALL) {
        const [
          youtubeResults,
          topLevelResults,
          episodeResults,
          newsResults, // --- [NEW] Add news to the 'ALL' search ---
        ] = await Promise.all([
          this.youtubeService.searchYouTube(query),
          this.contentService.searchTopLevelContent(query),
          this.contentService.searchEpisodes(query),
          this.newsService.search(query), // --- [NEW] Call the news search method ---
        ]);
        results.youtube = youtubeResults;
        results.content = [...topLevelResults, ...episodeResults];
        results.news = newsResults;
      } else if (type === SearchType.YOUTUBE) {
        results.youtube = await this.youtubeService.searchYouTube(query);
      } else if (type === SearchType.NEWS) {
        // --- [NEW] Handle the specific NEWS search type ---
        results.news = await this.newsService.search(query);
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
      // Return a clean structure even on failure
      return { youtube: [], content: [], news: [] };
    }

    return results;
  }
}