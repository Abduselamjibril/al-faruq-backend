// src/youtube/youtube.service.ts

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
// FIX: Use 'import type' for type-only imports to satisfy the 'isolatedModules' compiler option.
import type { Cache } from 'cache-manager';
import { google, youtube_v3 } from 'googleapis';
import { PlaylistItemDto } from './dto/playlist-response.dto';

@Injectable()
export class YoutubeService {
  // A logger for printing helpful messages and errors to the console.
  private readonly logger = new Logger(YoutubeService.name);

  // The YouTube API client instance.
  private readonly youtube: youtube_v3.Youtube;

  // Key for storing and retrieving the playlist data from the cache.
  private readonly CACHE_KEY = 'YOUTUBE_PLAYLIST_DATA';

  // Constructor: This is where we inject dependencies.
  // NestJS provides instances of Cache, ConfigService, etc., automatically.
  constructor(
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {
    // Initialize the YouTube API client using the API key from the .env file.
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.configService.get<string>('YOUTUBE_API_KEY'),
    });
  }

  /**
   * Fetches video data for a given YouTube playlist.
   * It first checks a local cache. If the data is not in the cache or is stale,
   * it fetches fresh data from the YouTube API, stores it in the cache, and then returns it.
   * @returns A promise that resolves to an array of PlaylistItemDto objects.
   */
  async getPlaylistVideos(): Promise<PlaylistItemDto[]> {
    // 1. Check the cache first.
    const cachedData = await this.cacheManager.get<PlaylistItemDto[]>(
      this.CACHE_KEY,
    );
    if (cachedData) {
      this.logger.log('Serving playlist from cache.');
      return cachedData;
    }

    // 2. If no cache, fetch from the API.
    this.logger.log(
      'Cache empty or expired. Fetching fresh playlist from YouTube API.',
    );
    try {
      const playlistId = this.configService.get<string>('YOUTUBE_PLAYLIST_ID');
      if (!playlistId) {
        throw new Error('YOUTUBE_PLAYLIST_ID is not set in the .env file.');
      }

      // FIX: Correctly handle the type for nextPageToken. It can be string, null, or undefined from the API.
      let nextPageToken: string | null | undefined;
      const allVideos: youtube_v3.Schema$PlaylistItem[] = [];

      // 3. Handle Pagination: The API returns up to 50 items per request.
      // We loop until there are no more pages of results.
      do {
        // Define the parameters object for the API call.
        const params: youtube_v3.Params$Resource$Playlistitems$List = {
          part: ['snippet'],
          playlistId: playlistId,
          maxResults: 50,
        };

        // FIX: Conditionally add the pageToken to the params object.
        // This ensures we only pass a 'string' and never 'null' or 'undefined', which solves the TypeScript error.
        if (nextPageToken) {
          params.pageToken = nextPageToken;
        }

        const response = await this.youtube.playlistItems.list(params);

        if (response.data.items) {
          allVideos.push(...response.data.items);
        }
        
        // The loop continues as long as the API provides a nextPageToken.
        nextPageToken = response.data.nextPageToken;
      } while (nextPageToken);

      // 4. Transform the raw API data into our clean DTO format.
      const formattedVideos = this.formatVideoData(allVideos);

      // 5. Store the fresh data in the cache for future requests.
      // The TTL (time-to-live) is set globally in app.module.ts.
      await this.cacheManager.set(this.CACHE_KEY, formattedVideos);

      return formattedVideos;
    } catch (error) {
      this.logger.error('Failed to fetch YouTube playlist', error.stack);
      // In case of an error, we throw an exception which NestJS will handle.
      throw new Error('Could not retrieve playlist from YouTube.');
    }
  }

  /**
   * A private helper method to transform the raw YouTube API response
   * into our custom, clean PlaylistItemDto format.
   * @param items - An array of playlist items from the YouTube API.
   * @returns An array of formatted PlaylistItemDto objects.
   */
  private formatVideoData(
    items: youtube_v3.Schema$PlaylistItem[],
  ): PlaylistItemDto[] {
    return items
      .map((item) => {
        // We only want to include valid video entries.
        if (
          item.snippet &&
          item.snippet.resourceId &&
          item.snippet.resourceId.videoId &&
          item.snippet.title &&
          item.snippet.thumbnails
        ) {
          return {
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnailUrl:
              item.snippet.thumbnails.high?.url || // Prefer high quality
              item.snippet.thumbnails.medium?.url || // Fallback to medium
              item.snippet.thumbnails.default?.url, // Fallback to default
            publishedAt: item.snippet.publishedAt,
          };
        }
        return null; // Return null for invalid items
      })
      .filter((item): item is PlaylistItemDto => item !== null); // Filter out any null entries
  }
}