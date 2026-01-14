// src/content/dto/create-content.dto.ts

import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsInt,
  Min,
  ValidateIf,
  IsUrl,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus, ContentType } from '../entities/content.entity';

export class CreateContentDto {
  @ApiProperty({
    description: 'The title of the content.',
    example: 'Inception',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: 'A detailed description or synopsis of the content. Required for Books.',
    example: 'A thief who steals corporate secrets...',
  })
  @ValidateIf((o) => o.type === ContentType.BOOK)
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The type of the content.',
    enum: ContentType,
    example: ContentType.MOVIE,
  })
  @IsEnum(ContentType)
  @IsNotEmpty()
  type: ContentType;

  @ApiPropertyOptional({
    description: 'The ID of the parent content (e.g., a Series ID for a Season).',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'The initial status of the content. Defaults to DRAFT if not provided.',
    enum: [ContentStatus.DRAFT, ContentStatus.PENDING_REVIEW],
    example: ContentStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum([ContentStatus.DRAFT, ContentStatus.PENDING_REVIEW])
  status?: ContentStatus;

  @ApiPropertyOptional({
    description:
      'Primary video file URL (required for playable types unless youtubeUrl is provided).',
    example: 'https://cdn.example.com/videos/inception.mp4',
  })
  @ValidateIf(
    (o) =>
      [
        ContentType.MOVIE,
        ContentType.MUSIC_VIDEO,
        ContentType.EPISODE,
        ContentType.DAWAH,
        ContentType.DOCUMENTARY,
        ContentType.PROPHET_HISTORY_EPISODE,
      ].includes(o.type) && !o.youtubeUrl,
  )
  @IsUrl()
  @IsOptional()
  videoUrl?: string;

  @ApiPropertyOptional({
    description:
      'YouTube video or audio URL (can be provided instead of a direct videoUrl).',
    example: 'https://www.youtube.com/watch?v=some_id',
  })
  @IsUrl()
  @IsOptional()
  youtubeUrl?: string;

  @ApiPropertyOptional({
    description:
      'Main audio file URL (required for PROPHET_HISTORY_EPISODE unless youtubeUrl is provided; optional for BOOK).',
    example: 'https://cdn.example.com/audio/prophet-history-ep1.mp3',
  })
  @ValidateIf(
    (o) => o.type === ContentType.PROPHET_HISTORY_EPISODE && !o.youtubeUrl,
  )
  @IsUrl()
  @IsOptional()
  audioUrl?: string;
  
  @ApiPropertyOptional({
    description: 'The URL of the PDF file (Required for BOOK).',
    example: 'https://cdn.example.com/books/book-title.pdf',
  })
  @ValidateIf((o) => o.type === ContentType.BOOK)
  @IsUrl()
  @IsOptional()
  pdfUrl?: string;

  @ApiPropertyOptional({
    description: 'The duration of the media in seconds (for playable content).',
    example: 9000,
  })
  @ValidateIf((o) =>
    [
      ContentType.MOVIE,
      ContentType.MUSIC_VIDEO,
      ContentType.EPISODE,
      ContentType.DAWAH,
      ContentType.DOCUMENTARY,
      ContentType.PROPHET_HISTORY_EPISODE,
    ].includes(o.type),
  )
  @IsInt()
  @Min(1)
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({
    description: 'The URL of the thumbnail image (for all top-level content).',
    example: 'https://cdn.example.com/images/inception-poster.jpg',
  })
  @ValidateIf((o) =>
    [
      ContentType.MOVIE,
      ContentType.MUSIC_VIDEO,
      ContentType.SERIES,
      ContentType.DAWAH,
      ContentType.DOCUMENTARY,
      ContentType.PROPHET_HISTORY,
      ContentType.BOOK,
    ].includes(o.type),
  )
  @IsUrl()
  @IsOptional()
  thumbnailUrl?: string;

  @ApiPropertyOptional({
    description: 'The URL of the trailer video file.',
    example: 'https://cdn.example.com/videos/inception-trailer.mp4',
  })
  @IsOptional()
  @IsUrl()
  trailerUrl?: string;

  @ApiPropertyOptional({
    description: 'Comma-separated tags for categorization and search.',
    example: 'Seerah,Prophets,Makkah',
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiPropertyOptional({
    description: "The name of the book's author (Required for BOOK).",
    example: 'Imam Al-Ghazali',
  })
  @ValidateIf((o) => o.type === ContentType.BOOK)
  @IsString()
  @IsOptional()
  authorName?: string;
  
  @ApiPropertyOptional({
    description: 'A long-form description about the book.',
    example: 'This book explores the depths of...',
  })
  @IsString()
  @IsOptional()
  about?: string;
  
  @ApiPropertyOptional({
    description: "The genre of the book (e.g., Fiqh, Seerah, History).",
    example: 'Fiqh',
  })
  @IsString()
  @IsOptional()
  genre?: string;

  @ApiPropertyOptional({
    description: 'The total number of pages in the book.',
    example: 250,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number;
  
  @ApiPropertyOptional({
    description: 'The year the book was published.',
    example: 1998,
  })
  @IsInt()
  @IsOptional()
  publicationYear?: number;
}