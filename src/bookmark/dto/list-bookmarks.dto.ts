import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { ContentType } from '../../content/entities/content.entity';
import type { BookmarkType } from '../entities/bookmark.entity';

export class ListBookmarksDto {
  @ApiPropertyOptional({
    enum: [...Object.values(ContentType), 'reciter', 'tafsir'],
    description: 'Filter by bookmark type (ContentType, reciter, or tafsir)',
    enumName: 'BookmarkType',
  })
  @IsOptional()
  @IsEnum([...Object.values(ContentType), 'reciter', 'tafsir'])
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
