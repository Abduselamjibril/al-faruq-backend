import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import type { BookmarkType } from '../entities/bookmark.entity';

export class ListBookmarksDto {
  @ApiPropertyOptional({
    enum: ['content', 'reciter', 'tafsir'],
    description: 'Filter by bookmark type',
    enumName: 'BookmarkType',
  })
  @IsOptional()
  @IsEnum(['content', 'reciter', 'tafsir'])
  type?: BookmarkType;

  @ApiPropertyOptional({ default: 1, description: 'Page number' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, description: 'Items per page' })
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
