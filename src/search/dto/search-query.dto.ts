// src/search/dto/search-query.dto.ts

import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Trim, Escape } from 'class-sanitizer';
import { ApiProperty } from '@nestjs/swagger';

export enum SearchType {
  ALL = 'all',
  YOUTUBE = 'youtube',
  NEWS = 'news',
  QURAN = 'quran', // --- [NEW] ADDED QURAN SEARCH TYPE ---
  SURAH = 'surah', // --- [NEW] ADDED SURAH SEARCH TYPE ---
  MOVIE = 'MOVIE',
  MUSIC_VIDEO = 'MUSIC_VIDEO',
  SERIES = 'SERIES',
  DAWAH = 'DAWAH',
  DOCUMENTARY = 'DOCUMENTARY',
  PROPHET_HISTORY = 'PROPHET_HISTORY',
  BOOK = 'BOOK',
  EPISODES = 'episodes', // A special category for all child-level content
}

export class SearchQueryDto {
  @ApiProperty({
    description:
      'The search term provided by the user. Must be at least 2 characters long.',
    example: 'abraham',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @Trim()
  @Escape()
  query: string;

  @ApiProperty({
    description: `The specific type of content to search for.`,
    enum: SearchType,
    default: SearchType.ALL,
    example: SearchType.BOOK,
  })
  @IsEnum(SearchType)
  @IsNotEmpty()
  type: SearchType;
}