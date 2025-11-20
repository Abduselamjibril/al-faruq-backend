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
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // --- IMPORT THIS ---
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
    description: 'A detailed description or synopsis of the content.',
    example: 'A thief who steals corporate secrets through the use of dream-sharing technology...',
    required: false,
  })
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
    description: 'The ID of the parent content (e.g., a Series ID for a Season, or a Season ID for an Episode).',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  parentId?: string;

  @ApiProperty({
    description: 'The URL of the main video file (for MOVIE, MUSIC_VIDEO, EPISODE).',
    example: 'https://cdn.example.com/videos/inception.mp4',
    required: false,
  })
  @ValidateIf((o) => [ContentType.MOVIE, ContentType.MUSIC_VIDEO, ContentType.EPISODE].includes(o.type))
  @IsString()
  @IsNotEmpty()
  videoUrl?: string;

  @ApiProperty({
    description: 'The duration of the video in seconds (for MOVIE, MUSIC_VIDEO, EPISODE).',
    example: 9000, // 2.5 hours
    required: false,
  })
  @ValidateIf((o) => [ContentType.MOVIE, ContentType.MUSIC_VIDEO, ContentType.EPISODE].includes(o.type))
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  duration?: number;

  @ApiProperty({
    description: 'The URL of the thumbnail image (for MOVIE, MUSIC_VIDEO, SERIES).',
    example: 'https://cdn.example.com/images/inception-poster.jpg',
    required: false,
  })
  @ValidateIf((o) => [ContentType.MOVIE, ContentType.MUSIC_VIDEO, ContentType.SERIES].includes(o.type))
  @IsString()
  @IsNotEmpty()
  thumbnailUrl?: string;

  @ApiProperty({
    description: 'The URL of the trailer video file.',
    example: 'https://cdn.example.com/videos/inception-trailer.mp4',
    required: false,
  })
  @IsOptional()
  @IsString()
  trailerUrl?: string;
}