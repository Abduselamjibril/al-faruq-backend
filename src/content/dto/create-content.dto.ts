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
import { ApiProperty } from '@nestjs/swagger';
import { ContentType } from '../entities/content.entity';

export class CreateContentDto {
  @ApiProperty({
    description: 'The title of the content.',
    example: 'Inception',
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({
    description: 'A detailed description or synopsis of the content. Required for Books.',
    example: 'A thief who steals corporate secrets...',
    required: false,
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

  @ApiProperty({
    description: 'The ID of the parent content (e.g., a Series ID for a Season).',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiProperty({
    description: 'The URL of the main video file (for MOVIE, EPISODE, etc.).',
    example: 'https://cdn.example.com/videos/inception.mp4',
    required: false,
  })
  @ValidateIf((o) =>
    [
      ContentType.MOVIE,
      ContentType.MUSIC_VIDEO,
      ContentType.EPISODE,
      ContentType.DAWAH,
      ContentType.DOCUMENTARY,
    ].includes(o.type),
  )
  @IsUrl()
  @IsNotEmpty()
  videoUrl?: string;

  @ApiProperty({
    description: 'The URL of the main audio file (for PROPHET_HISTORY_EPISODE or BOOK).',
    example: 'https://cdn.example.com/audio/prophet-history-ep1.mp3',
    required: false,
  })
  @ValidateIf((o) => o.type === ContentType.PROPHET_HISTORY_EPISODE)
  @IsUrl()
  @IsNotEmpty()
  @IsOptional() // Keep it optional for books
  audioUrl?: string;
  
  // --- [NEW] PDF URL FIELD FOR BOOKS ---
  @ApiProperty({
    description: 'The URL of the PDF file (Required for BOOK).',
    example: 'https://cdn.example.com/books/book-title.pdf',
    required: false,
  })
  @ValidateIf((o) => o.type === ContentType.BOOK)
  @IsUrl()
  @IsNotEmpty()
  pdfUrl?: string;

  @ApiProperty({
    description: 'The duration of the media in seconds (for playable content).',
    example: 9000,
    required: false,
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
  @IsNotEmpty()
  duration?: number;

  @ApiProperty({
    description: 'The URL of the thumbnail image (for all top-level content).',
    example: 'https://cdn.example.com/images/inception-poster.jpg',
    required: false,
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
  @IsNotEmpty()
  thumbnailUrl?: string;

  @ApiProperty({
    description: 'The URL of the trailer video file.',
    example: 'https://cdn.example.com/videos/inception-trailer.mp4',
    required: false,
  })
  @IsOptional()
  @IsUrl()
  trailerUrl?: string;

  @ApiProperty({
    description: 'Comma-separated tags for categorization and search.',
    example: 'Seerah,Prophets,Makkah',
    required: false,
  })
  @IsOptional()
  @IsString()
  tags?: string;

  @ApiProperty({
    description: "The name of the book's author (Required for BOOK).",
    example: 'Imam Al-Ghazali',
    required: false,
  })
  @ValidateIf((o) => o.type === ContentType.BOOK)
  @IsString()
  @IsNotEmpty()
  authorName?: string;
  
  @ApiProperty({
    description: 'A long-form description about the book.',
    example: 'This book explores the depths of...',
    required: false,
  })
  @IsString()
  @IsOptional()
  about?: string;
  
  @ApiProperty({
    description: "The genre of the book (e.g., Fiqh, Seerah, History).",
    example: 'Fiqh',
    required: false,
  })
  @IsString()
  @IsOptional()
  genre?: string;

  @ApiProperty({
    description: 'The total number of pages in the book.',
    example: 250,
    required: false,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  pageSize?: number;
  
  @ApiProperty({
    description: 'The year the book was published.',
    example: 1998,
    required: false,
  })
  @IsInt()
  @IsOptional()
  publicationYear?: number;

  
}