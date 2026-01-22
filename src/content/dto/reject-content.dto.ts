// src/content/dto/reject-content.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Trim, Escape } from 'class-sanitizer';

export class RejectContentDto {
  @ApiProperty({
    description: 'The reason for rejecting the content. This will be shown to the uploader.',
    example: 'The audio quality is too low and there is background noise.',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @Trim()
  @Escape()
  rejectionReason: string;
}