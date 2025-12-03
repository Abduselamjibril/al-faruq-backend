// src/quran/dto/reciter-query.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ReciterQueryDto {
  @ApiPropertyOptional({
    description: 'Filter reciters by a specific language ID.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  @IsOptional()
  languageId?: string;
}