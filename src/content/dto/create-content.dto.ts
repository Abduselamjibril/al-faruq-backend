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
  IsBoolean,
  IsArray,
  ValidateNested,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { escapeHtml } from '../../common/utils/sanitize.util';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ContentStatus,
  ContentType,
  ContentMediaType,
} from '../entities/content.entity';
import { Type } from 'class-transformer';

// --- [NEW] ---
// DTO for a single media item with validation.
export class ContentMediaItemDto {
  @ApiProperty({
    description: 'The public URL of the media file.',
    example: 'https://cdn.example.com/images/poster1.jpg',
  })
  @IsUrl()
  @IsNotEmpty()
  url: string;

  @ApiProperty({
    description: 'The type of the media (THUMBNAIL or POSTER).',
    enum: ContentMediaType,
    example: ContentMediaType.POSTER,
  })
  @IsEnum(ContentMediaType)
  @IsNotEmpty()
  type: ContentMediaType;

  @ApiProperty({
    description: 'Specifies if this is the primary thumbnail. Only one thumbnail per content item can be primary.',
    example: false,
  })
  @IsBoolean()
  isPrimary: boolean;
}

// --- [NEW] ---
// Custom validator to enforce the business rule that only one thumbnail can be primary.
@ValidatorConstraint({ name: 'IsOnePrimaryThumbnail', async: false })
export class IsOnePrimaryThumbnailConstraint implements ValidatorConstraintInterface {
  validate(media: ContentMediaItemDto[], args: ValidationArguments) {
    // If media is not provided or not an array, this rule passes (other validators will catch it).
    if (!media || !Array.isArray(media)) {
      return true;
    }
    // Filter to find how many items are marked as a primary thumbnail.
    const primaryThumbnails = media.filter(
      (item) => item.type === ContentMediaType.THUMBNAIL && item.isPrimary,
    );
    // The validation passes if there are 0 or 1 primary thumbnails.
    return primaryThumbnails.length <= 1;
  }

  defaultMessage(args: ValidationArguments) {
    return 'There can be at most one primary thumbnail.';
  }
}

export class CreateContentDto {
  @ApiProperty({
    description: 'The title of the content.',
    example: 'Inception',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Transform(({ value }) => typeof value === 'string' ? escapeHtml(value) : value)
  title: string;

  @ApiPropertyOptional({
    description: 'A detailed description or synopsis of the content. Required for Books.',
    example: 'A thief who steals corporate secrets...',
  })
  @ValidateIf((o) => o.type === ContentType.BOOK)
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Transform(({ value }) => typeof value === 'string' ? escapeHtml(value) : value)
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
    example: 'https://www.youtube.com/watch?v=...',
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

  // --- [REMOVED] The old thumbnailUrl property has been replaced by the 'media' array below. ---
  // thumbnailUrl?: string;

  // --- [NEW] ---
  // This new property accepts an array of media objects.
  @ApiPropertyOptional({
    description: 'A list of media items (posters and thumbnails). The order of items will be preserved.',
    type: [ContentMediaItemDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true }) // Ensures each object in the array is validated.
  @Type(() => ContentMediaItemDto) // Necessary for class-validator to know the type of the objects.
  @Validate(IsOnePrimaryThumbnailConstraint) // Applies our custom validation rule.
  media?: ContentMediaItemDto[];
  // --- [END NEW] ---

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
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Transform(({ value }) => typeof value === 'string' ? escapeHtml(value) : value)
  tags?: string;

  @ApiPropertyOptional({
    description: "The name of the book's author (Required for BOOK).",
    example: 'Imam Al-Ghazali',
  })
  @ValidateIf((o) => o.type === ContentType.BOOK)
  @IsString()
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Transform(({ value }) => typeof value === 'string' ? escapeHtml(value) : value)
  authorName?: string;
  
  @ApiPropertyOptional({
    description: 'A long-form description about the book.',
    example: 'This book explores the depths of...',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Transform(({ value }) => typeof value === 'string' ? escapeHtml(value) : value)
  about?: string;
  
  @ApiPropertyOptional({
    description: "The genre of the book (e.g., Fiqh, Seerah, History).",
    example: 'Fiqh',
  })
  @IsString()
  @IsOptional()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Transform(({ value }) => typeof value === 'string' ? escapeHtml(value) : value)
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