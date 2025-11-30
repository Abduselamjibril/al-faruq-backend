// src/feed/dto/feed-query.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ContentType } from '../../content/entities/content.entity';

export class FeedQueryDto {
  @ApiPropertyOptional({
    description: 'The page number to retrieve.',
    default: 1,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'The number of items to return per page.',
    default: 10,
    minimum: 1,
    maximum: 50,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50) // Prevent users from requesting too much data at once
  @IsOptional()
  limit?: number = 10;

  @ApiPropertyOptional({
    description: 'Filter content by a specific category.',
    enum: ContentType,
  })
  @IsEnum(ContentType)
  @IsOptional()
  category?: ContentType;

  @ApiPropertyOptional({
    description: 'Filter books by author name (case-insensitive, partial match).',
    example: 'ghazali',
  })
  @IsString()
  @IsOptional()
  author?: string;

  @ApiPropertyOptional({
    description: 'Filter books by genre (case-insensitive, partial match).',
    example: 'Fiqh',
  })
  @IsString()
  @IsOptional()
  genre?: string;

  @ApiPropertyOptional({
    description: 'Filter books by publication year.',
    example: 2021,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  year?: number;
}