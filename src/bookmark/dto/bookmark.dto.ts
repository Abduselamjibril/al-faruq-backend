import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ContentType } from '../../content/entities/content.entity';
import type { BookmarkType } from '../entities/bookmark.entity';

export class AddBookmarkDto {
  @ApiProperty({
    enum: [...Object.values(ContentType), 'reciter', 'tafsir'],
    example: 'SERIES',
    description: 'Type of the item to bookmark (ContentType, reciter, or tafsir)',
  })
  @IsEnum([...Object.values(ContentType), 'reciter', 'tafsir'])
  type: BookmarkType;

  @ApiProperty({
    example: '123',
    description: 'ID of the item to bookmark',
  })
  @IsString()
  @IsNotEmpty()
  itemId: string;
}

export class RemoveBookmarkDto {
  @ApiProperty({
    enum: [...Object.values(ContentType), 'reciter', 'tafsir'],
    example: 'SERIES',
    description: 'Type of the item to remove from bookmarks (ContentType, reciter, or tafsir)',
  })
  @IsEnum([...Object.values(ContentType), 'reciter', 'tafsir'])
  type: BookmarkType;

  @ApiProperty({
    example: '123',
    description: 'ID of the item to remove from bookmarks',
  })
  @IsString()
  @IsNotEmpty()
  itemId: string;
}
