// src/quran/dto/create-reciter.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class CreateReciterDto {
  @ApiProperty({
    description: "The full name of the reciter or scholar.",
    example: 'Mishary Rashid Alafasy',
  })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @Escape()
  name: string;

  @ApiProperty({
    description: "A public URL for the reciter's profile image.",
    example: 'https://cdn.example.com/images/mishary.jpg',
  })
  @IsUrl()
  @IsNotEmpty()
  imageUrl: string;
}