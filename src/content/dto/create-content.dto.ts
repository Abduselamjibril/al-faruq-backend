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
import { ContentType } from '../entities/content.entity';

export class CreateContentDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(ContentType)
  @IsNotEmpty()
  type: ContentType;

  @IsUUID()
  @IsOptional()
  parentId?: string;
  
  @ValidateIf(o => [ContentType.MOVIE, ContentType.MUSIC_VIDEO, ContentType.EPISODE].includes(o.type))
  @IsString()
  @IsNotEmpty()
  videoUrl?: string;

  @ValidateIf(o => [ContentType.MOVIE, ContentType.MUSIC_VIDEO, ContentType.EPISODE].includes(o.type))
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  duration?: number;
  
  @ValidateIf(o => [ContentType.MOVIE, ContentType.MUSIC_VIDEO, ContentType.SERIES].includes(o.type))
  @IsString()
  @IsNotEmpty()
  thumbnailUrl?: string;

  // --- NEW OPTIONAL TRAILER FIELD ---
  // A trailer is optional, so we only validate it if it's provided.
  @IsOptional()
  @IsString()
  trailerUrl?: string;
}