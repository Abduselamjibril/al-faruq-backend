// src/youtube/dto/playlist-response.dto.ts

/**
 * This file defines the structure of a single video item
 * that our API will return to the Flutter application.
 * By using a DTO (Data Transfer Object), we ensure a consistent
 * and predictable response format.
 */

/**
 * Defines the possible privacy statuses for a YouTube video.
 * This ensures type safety and consistency.
 */
export enum VideoStatus {
  PUBLIC = 'public',
  PRIVATE = 'private',
  UNLISTED = 'unlisted',
}

/**
 * Defines the possible YouTube channel names for filtering.
 * This will be used by Swagger to generate a dropdown menu.
 * The values MUST EXACTLY match the channel titles from the YouTube API.
 */
export enum ChannelName {
  QURAN = 'AL-FARUK QURAN / አል-ፋሩቅ ቁርአን',
  MARIFAH = 'አል-ፋሩቅ አል-ማዕሪፋ / Al-FARUK AI-MARIFAH',
  FILMS = 'Al-Faruk Films',
  PRODUCTION = 'Al Faruk Multimedia Production',
}

export class PlaylistItemDto {
  /**
   * The unique YouTube video ID.
   * Example: "dQw4w9WgXcQ"
   */
  videoId: string;

  /**
   * The title of the video.
   * Example: "Rick Astley - Never Gonna Give You Up (Official Music Video)"
   */
  title: string;

  /**
   * The description of the video.
   * Example: "The official video for “Never Gonna Give You Up” by Rick Astley..."
   */
  description: string;

  /**
   * The URL of the high-quality video thumbnail.
   * Example: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg"
   */
  thumbnailUrl: string;

  /**
   * The date and time when the video was published, in ISO 8-601 format.
   * Example: "2009-10-25TT06:57:33Z"
   */
  publishedAt: string;

  /**
   * The privacy status of the video (public, private, or unlisted).
   * This is a new field to help the client filter content.
   * Example: "public"
   */
  status: VideoStatus;

  /**
   * The title of the YouTube channel that published the video.
   * This is a new field to help the client filter content by channel.
   * Example: "Al-faruk Quran"
   */
  channelTitle: string;
}