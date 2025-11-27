import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { Cache } from 'cache-manager';
import { google, youtube_v3 } from 'googleapis';
import { PlaylistItemDto, VideoStatus } from './dto/playlist-response.dto';

/**
 * Defines the structure for a single YouTube search result item.
 * This should ideally be in its own file, e.g., src/youtube/dto/youtube-search-result.dto.ts
 */
export class YouTubeSearchResultDto {
  videoId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
}

@Injectable()
export class YoutubeService {
  private readonly logger = new Logger(YoutubeService.name);
  private readonly youtube: youtube_v3.Youtube;
  private readonly CACHE_KEY = 'YOUTUBE_PLAYLIST_DATA';
  private readonly playlistId: string; // Store playlistId for reuse

  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('YOUTUBE_API_KEY');
    const playlistId = this.configService.get<string>('YOUTUBE_PLAYLIST_ID');

    if (!apiKey || !playlistId) {
      throw new Error(
        'YOUTUBE_API_KEY and YOUTUBE_PLAYLIST_ID must be configured in .env file.',
      );
    }
    this.playlistId = playlistId;

    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });
  }

  /**
   * Performs a general keyword search on YouTube.
   * Results are cached for 1 hour to improve performance and save API quota.
   * @param query The user's search term.
   * @returns A promise that resolves to an array of formatted search results.
   */
  async searchYouTube(query: string): Promise<YouTubeSearchResultDto[]> {
    const cacheKey = `YOUTUBE_SEARCH_${query.toUpperCase()}`;
    const cachedData = await this.cacheManager.get<YouTubeSearchResultDto[]>(
      cacheKey,
    );

    if (cachedData) {
      this.logger.log(`Serving YouTube search for "${query}" from cache.`);
      return cachedData;
    }

    this.logger.log(`Cache empty for "${query}". Fetching from YouTube API.`);
    try {
      // --- [FIX START] ---
      // We create a correctly typed parameters object to satisfy the googleapis library.
      const params: youtube_v3.Params$Resource$Search$List = {
        part: ['snippet'],
        q: query,
        type: ['video'], // This is the main fix: 'video' must be inside an array.
        maxResults: 20,
      };

      const response = await this.youtube.search.list(params);
      // --- [FIX END] ---

      const items = response.data.items || [];
      const formattedResults = this._formatSearchResultData(items);

      // Cache the results for 1 hour (3600 seconds)
      await this.cacheManager.set(cacheKey, formattedResults, 3600);

      return formattedResults;
    } catch (error) {
      this.logger.error(
        `Failed to perform YouTube search for "${query}"`,
        error.stack,
      );
      // We throw an error so the upstream service knows the call failed.
      throw new Error('Could not perform search on YouTube.');
    }
  }

  /**
   * This is a scheduled task that runs automatically every day at midnight.
   * It refreshes the YouTube playlist cache to ensure the data is up-to-date.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    timeZone: 'Africa/Addis_Ababa', // Set to your server's/users' timezone
  })
  async handleCron() {
    this.logger.log(
      'Running scheduled job: Refreshing YouTube playlist cache...',
    );
    await this.refreshPlaylistCache();
  }

  /**
   * The main public method to get playlist videos.
   * Checks the cache first, then fetches from the API if the cache is empty.
   * Filters the videos based on the optional 'status' parameter.
   */
  async getPlaylistVideos(
    status?: VideoStatus,
  ): Promise<PlaylistItemDto[]> {
    const cachedData = await this.cacheManager.get<PlaylistItemDto[]>(
      this.CACHE_KEY,
    );
    let videos: PlaylistItemDto[];

    if (cachedData) {
      this.logger.log('Serving playlist from cache.');
      videos = cachedData;
    } else {
      this.logger.log('Cache empty. Fetching fresh data to populate cache.');
      videos = await this._fetchAndCachePlaylist();
    }

    // If a status filter is provided by the client, apply it here
    if (status) {
      this.logger.log(`Filtering playlist for videos with status: ${status}`);
      return videos.filter((video) => video.status === status);
    }

    // If no filter is provided, return all videos
    return videos;
  }

  /**
   * (Admin only) Clears the existing cache and fetches fresh data from the YouTube API.
   * This method is now used by both the admin controller and the scheduled cron job.
   */
  async refreshPlaylistCache(): Promise<void> {
    this.logger.log('Refreshing YouTube playlist cache. Deleting old cache...');
    await this.cacheManager.del(this.CACHE_KEY);
    await this._fetchAndCachePlaylist();
    this.logger.log('Cache successfully refreshed.');
  }

  /**
   * The core private method that performs the API call to YouTube and caches the result.
   */
  private async _fetchAndCachePlaylist(): Promise<PlaylistItemDto[]> {
    this.logger.log('Fetching playlist from YouTube API...');
    try {
      let nextPageToken: string | null | undefined;
      const allVideos: youtube_v3.Schema$PlaylistItem[] = [];

      do {
        const params: youtube_v3.Params$Resource$Playlistitems$List = {
          part: ['snippet', 'status'],
          playlistId: this.playlistId,
          maxResults: 50,
        };

        if (nextPageToken) {
          params.pageToken = nextPageToken;
        }

        const response = await this.youtube.playlistItems.list(params);

        if (response.data.items) {
          allVideos.push(...response.data.items);
        }

        nextPageToken = response.data.nextPageToken;
      } while (nextPageToken);

      const formattedVideos = this._formatVideoData(allVideos);

      await this.cacheManager.set(this.CACHE_KEY, formattedVideos);
      this.logger.log(
        `Successfully fetched and cached ${formattedVideos.length} videos.`,
      );

      return formattedVideos;
    } catch (error) {
      this.logger.error('Failed to fetch YouTube playlist', error.stack);
      throw new Error('Could not retrieve playlist from YouTube.');
    }
  }

  /**
   * A private helper method to transform the raw YouTube API search response
   * into our custom, clean YouTubeSearchResultDto format.
   */
  private _formatSearchResultData(
    items: youtube_v3.Schema$SearchResult[],
  ): YouTubeSearchResultDto[] {
    return items
      .map((item) => {
        if (
          item.id &&
          item.id.videoId &&
          item.snippet &&
          item.snippet.title &&
          item.snippet.thumbnails
        ) {
          return {
            videoId: item.id.videoId,
            title: item.snippet.title,
            description: item.snippet.description || '',
            thumbnailUrl:
              item.snippet.thumbnails.high?.url ||
              item.snippet.thumbnails.medium?.url ||
              item.snippet.thumbnails.default?.url ||
              '',
            channelTitle: item.snippet.channelTitle || '',
            publishedAt: item.snippet.publishedAt || '',
          };
        }
        return null;
      })
      .filter((item): item is YouTubeSearchResultDto => item !== null);
  }

  /**
   * A private helper method to transform the raw YouTube API playlist response
   * into our custom, clean PlaylistItemDto format.
   */
  private _formatVideoData(
    items: youtube_v3.Schema$PlaylistItem[],
  ): PlaylistItemDto[] {
    return items
      .map((item) => {
        if (
          item.snippet &&
          item.snippet.resourceId &&
          item.snippet.resourceId.videoId &&
          item.snippet.title &&
          item.snippet.thumbnails &&
          item.status
        ) {
          return {
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            description: item.snippet.description || '',
            thumbnailUrl:
              item.snippet.thumbnails.high?.url ||
              item.snippet.thumbnails.medium?.url ||
              item.snippet.thumbnails.default?.url ||
              '',
            publishedAt: item.snippet.publishedAt || '',
            status: item.status.privacyStatus as VideoStatus,
          };
        }
        return null;
      })
      .filter((item): item is PlaylistItemDto => item !== null);
  }
}