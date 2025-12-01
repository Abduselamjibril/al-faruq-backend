// src/search/dto/search-query.dto.ts

import { IsEnum, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// --- [REPLACED] The old enum is replaced with a comprehensive one ---
export enum SearchType {
  ALL = 'all',
  YOUTUBE = 'youtube',
  NEWS = 'news', // --- [NEW] ADDED NEWS SEARCH TYPE ---
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
    description: 'The search term provided by the user. Must be at least 2 characters long.',
    example: 'abraham',
    minLength: 2,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  query: string;

  @ApiProperty({
    // --- [MODIFIED] Updated the description to list all new options ---
    description: `The specific type of content to search for.`,
    enum: SearchType,
    default: SearchType.ALL,
    example: SearchType.BOOK,
  })
  @IsEnum(SearchType)
  @IsNotEmpty()
  type: SearchType;
}