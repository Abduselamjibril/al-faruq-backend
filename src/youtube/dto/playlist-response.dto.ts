// src/youtube/dto/playlist-response.dto.ts

/**
 * This file defines the structure of a single video item
 * that our API will return to the Flutter application.
 * By using a DTO (Data Transfer Object), we ensure a consistent
 * and predictable response format.
 */

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
   * The date and time when the video was published, in ISO 8601 format.
   * Example: "2009-10-25T06:57:33Z"
   */
  publishedAt: string;
}