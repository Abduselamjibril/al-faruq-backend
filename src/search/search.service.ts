import { Injectable, Logger } from '@nestjs/common';
import { SearchType } from './dto/search-query.dto';
import { YoutubeService } from '../youtube/youtube.service';
import { ContentService } from '../content/content.service';
import { YouTubeSearchResultDto } from '../youtube/youtube.service';
import { Content } from '../content/entities/content.entity';

// Define the structure of the final search response.
export interface SearchResult {
  youtube: YouTubeSearchResultDto[];
  movies: Content[];
  episodes: Content[];
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

    // Handle the 'all' case by running all searches in parallel.
    if (type === SearchType.ALL) {
      const [youtubeResults, movieResults, episodeResults] = await Promise.all([
        this.youtubeService.searchYouTube(query).catch((error) => {
          this.logger.error('YouTube search failed', error.stack);
          return []; // Return empty array on error to not fail the whole search
        }),
        this.contentService.searchTopLevelContent(query).catch((error) => {
          this.logger.error('Movie search failed', error.stack);
          return [];
        }),
        this.contentService.searchEpisodes(query).catch((error) => {
          this.logger.error('Episode search failed', error.stack);
          return [];
        }),
      ]);

      return {
        youtube: youtubeResults,
        movies: movieResults,
        episodes: episodeResults,
      };
    }

    // Handle single-type searches.
    const results: SearchResult = {
      youtube: [],
      movies: [],
      episodes: [],
    };

    try {
      if (type === SearchType.YOUTUBE) {
        results.youtube = await this.youtubeService.searchYouTube(query);
      } else if (type === SearchType.MOVIE) {
        results.movies = await this.contentService.searchTopLevelContent(query);
      } else if (type === SearchType.EPISODE) {
        results.episodes = await this.contentService.searchEpisodes(query);
      }
    } catch (error) {
      this.logger.error(
        `Search failed for type ${type} with query "${query}"`,
        error.stack,
      );
      // In case of an error in a single search, we still return the structured
      // response with empty arrays, so the Flutter app doesn't crash.
    }

    return results;
  }
}