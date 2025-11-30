// src/search/search.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { SearchType } from './dto/search-query.dto';
import { YoutubeService } from '../youtube/youtube.service';
import { ContentService } from '../content/content.service';
import { YouTubeSearchResultDto } from '../youtube/youtube.service';
import { Content, ContentType } from '../content/entities/content.entity';

// Define the structure of the final search response.
export interface SearchResult {
  youtube: YouTubeSearchResultDto[];
  content: Content[]; // A single array for all content types
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(
    private readonly youtubeService: YoutubeService,
    private readonly contentService: ContentService,
  ) {}

  async performSearch(
    query: string,
    type: SearchType,
  ): Promise<SearchResult> {
    this.logger.log(`Performing search for query="${query}" with type="${type}"`);

    // Define which search types are considered "top-level" content
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
    };

    try {
      if (type === SearchType.ALL) {
        const [youtubeResults, topLevelResults, episodeResults] =
          await Promise.all([
            this.youtubeService.searchYouTube(query),
            this.contentService.searchTopLevelContent(query),
            this.contentService.searchEpisodes(query),
          ]);
        results.youtube = youtubeResults;
        results.content = [...topLevelResults, ...episodeResults];
      } else if (type === SearchType.YOUTUBE) {
        results.youtube = await this.youtubeService.searchYouTube(query);
      } else if (type === SearchType.EPISODES) {
        results.content = await this.contentService.searchEpisodes(query);
      } else if (topLevelTypes.includes(type)) {
        // --- [FIX] Applied the explicit 'as unknown as' cast to satisfy TypeScript ---
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
      return { youtube: [], content: [] };
    }

    return results;
  }
}