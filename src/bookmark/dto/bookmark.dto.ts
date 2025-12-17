import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import type { BookmarkType } from '../entities/bookmark.entity';

export class AddBookmarkDto {
  @IsEnum(['content', 'reciter', 'tafsir'])
  type: BookmarkType;

  @IsString()
  @IsNotEmpty()
  itemId: string;
}

export class RemoveBookmarkDto {
  @IsEnum(['content', 'reciter', 'tafsir'])
  type: BookmarkType;

  @IsString()
  @IsNotEmpty()
  itemId: string;
}
