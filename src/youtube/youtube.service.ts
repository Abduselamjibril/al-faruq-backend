// src/youtube/youtube.service.ts

import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Cache } from 'cache-manager';
import { google, youtube_v3 } from 'googleapis';
import { PlaylistItemDto } from './dto/playlist-response.dto';

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
    // --- START: CONFIGURATION VALIDATION ---
    const apiKey = this.configService.get<string>('YOUTUBE_API_KEY');
    const playlistId = this.configService.get<string>('YOUTUBE_PLAYLIST_ID');

    if (!apiKey || !playlistId) {
      throw new Error(
        'YOUTUBE_API_KEY and YOUTUBE_PLAYLIST_ID must be configured in .env file.',
      );
    }
    this.playlistId = playlistId;
    // --- END: CONFIGURATION VALIDATION ---

    this.youtube = google.youtube({
      version: 'v3',
      auth: apiKey,
    });
  }

  /**
   * The main public method to get playlist videos.
   * Checks the cache first and fetches from the API if the cache is empty.
   */
  async getPlaylistVideos(): Promise<PlaylistItemDto[]> {
    const cachedData = await this.cacheManager.get<PlaylistItemDto[]>(
      this.CACHE_KEY,
    );
    if (cachedData) {
      this.logger.log('Serving playlist from cache.');
      return cachedData;
    }

    this.logger.log('Cache empty. Fetching fresh data to populate cache.');
    return this._fetchAndCachePlaylist();
  }

  /**
   * (Admin only) Clears the existing cache and fetches fresh data from the YouTube API.
   */
  async refreshPlaylistCache(): Promise<void> {
    this.logger.log('Admin triggered cache refresh. Deleting old cache...');
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
          part: ['snippet'],
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
      this.logger.log(`Successfully fetched and cached ${formattedVideos.length} videos.`);

      return formattedVideos;
    } catch (error) {
      this.logger.error('Failed to fetch YouTube playlist', error.stack);
      throw new Error('Could not retrieve playlist from YouTube.');
    }
  }

  /**
   * A private helper method to transform the raw YouTube API response
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
          item.snippet.thumbnails
        ) {
          return {
            videoId: item.snippet.resourceId.videoId,
            title: item.snippet.title,
            description: item.snippet.description || '', // Ensure description is always a string
            thumbnailUrl:
              item.snippet.thumbnails.high?.url ||
              item.snippet.thumbnails.medium?.url ||
              item.snippet.thumbnails.default?.url ||
              '', // Ensure thumbnailUrl is always a string
            publishedAt: item.snippet.publishedAt || '', // Ensure publishedAt is always a string
          };
        }
        return null;
      })
      .filter((item): item is PlaylistItemDto => item !== null);
  }
}