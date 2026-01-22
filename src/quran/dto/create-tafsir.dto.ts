// src/quran/dto/create-tafsir.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
} from 'class-validator';
import { Trim, Escape } from 'class-sanitizer';
import { SurahEnum } from '../enums/surah.enum';

export class CreateTafsirDto {
  @ApiProperty({
    description: 'The title of the audio lecture or recitation.',
    example: 'Full Surah Recitation',
  })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @Escape()
  title: string;

  @ApiProperty({
    description: 'An optional subtitle for the audio.',
    example: 'Hafs an Asim',
    required: false,
  })
  @IsString()
  @IsOptional()
  @Trim()
  @Escape()
  subtitle?: string;


  @ApiProperty({
    description: 'The public URL of the uploaded audio file.',
    example: 'https://cdn.example.com/audio/al-fatiha.mp3',
  })
  @IsUrl()
  @IsNotEmpty()
  audioUrl: string;

  @ApiProperty({
    description: 'Optional YouTube video or audio URL for this tafsir.',
    example: 'https://www.youtube.com/watch?v=xyz456',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  youtubeUrl?: string;

  @ApiProperty({
    description: 'The Surah this audio belongs to.',
    enum: SurahEnum,
    example: SurahEnum['1. Al-Fatihah'],
  })
  @IsEnum(SurahEnum)
  @IsNotEmpty()
  surahId: SurahEnum;

  @ApiProperty({
    description: 'The UUID of the Reciter for this audio.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  @IsNotEmpty()
  reciterId: string;

  @ApiProperty({
    description: 'The UUID of the Language for this audio.',
    example: 'b2c3d4e5-f6a7-8901-2345-67890abcdef1',
  })
  @IsUUID()
  @IsNotEmpty()
  languageId: string;
}