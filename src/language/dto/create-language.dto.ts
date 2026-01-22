// src/language/dto/create-language.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateLanguageDto {
  @ApiProperty({
    description: 'The full name of the language.',
    example: 'Amharic',
  })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @Escape()
  name: string;

  @ApiProperty({
    description: 'The short, unique code for the language (ISO 639-1 style).',
    example: 'am',
  })
  @IsString()
  @IsNotEmpty()
  @Length(2, 10)
  @Trim()
  @Escape()
  code: string;
}