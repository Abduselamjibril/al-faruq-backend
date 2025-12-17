import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import type { BookmarkType } from '../entities/bookmark.entity';

export class AddBookmarkDto {
  @ApiProperty({
    enum: ['content', 'reciter', 'tafsir'],
    example: 'content',
    description: 'Type of the item to bookmark',
  })
  @IsEnum(['content', 'reciter', 'tafsir'])
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
    enum: ['content', 'reciter', 'tafsir'],
    example: 'content',
    description: 'Type of the item to remove from bookmarks',
  })
  @IsEnum(['content', 'reciter', 'tafsir'])
  type: BookmarkType;

  @ApiProperty({
    example: '123',
    description: 'ID of the item to remove from bookmarks',
  })
  @IsString()
  @IsNotEmpty()
  itemId: string;
}
