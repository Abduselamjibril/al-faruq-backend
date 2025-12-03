// src/search/dto/search-result.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { Content } from '../../content/entities/content.entity';
import { News } from '../../news/entities/news.entity';
import { Reciter } from '../../quran/entities/reciter.entity';
import { Surah } from '../../quran/entities/surah.entity';

/**
 * An example DTO representing a single YouTube search result for documentation.
 */
class YoutubeResultExampleDto {
  @ApiProperty({ example: 'dQw4w9WgXcQ' })
  videoId: string;

  @ApiProperty({
    example: 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
  })
  title: string;

  @ApiProperty({
    example: 'The official video for “Never Gonna Give You Up” by Rick Astley...',
  })
  description: string;

  @ApiProperty({
    example: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
  })
  thumbnailUrl: string;

  @ApiProperty({ example: 'RickAstleyVEVO' })
  channelTitle: string;

  @ApiProperty({ example: '2009-10-25T06:57:33Z' })
  publishedAt: string;
}

// --- [NEW] A DTO to structure the Quran search results ---
class QuranSearchResultDto {
  @ApiProperty({
    description: 'A list of matching Surahs.',
    type: [Surah],
  })
  surahs: Surah[];

  @ApiProperty({
    description: 'A list of matching Reciters.',
    type: [Reciter],
  })
  reciters: Reciter[];
}

/**
 * Defines the final structure of the search response body.
 */
export class SearchResultDto {
  @ApiProperty({
    description: 'A list of search results from YouTube.',
    type: [YoutubeResultExampleDto],
  })
  youtube: YoutubeResultExampleDto[];

  // --- [MODIFIED] Consolidated 'movies' and 'episodes' into a single 'content' array ---
  @ApiProperty({
    description:
      'A list of matching content from the local database (e.g., Movies, Series, Episodes).',
    type: [Content],
  })
  content: Content[];

  @ApiProperty({
    description: 'A list of matching news articles from the local database.',
    type: [News],
  })
  news: News[];

  // --- [NEW] Added the quran property to hold Quran-related search results ---
  @ApiProperty({
    description: 'A collection of matching Surahs and Reciters.',
    type: QuranSearchResultDto,
  })
  quran: QuranSearchResultDto;
}