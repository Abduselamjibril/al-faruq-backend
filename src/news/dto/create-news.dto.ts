// src/news/dto/create-news.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { Trim, Escape } from 'class-sanitizer';

export class CreateNewsDto {
  @ApiProperty({
    description: 'The title or headline of the news article.',
    example: 'Community Iftar Event Announced',
  })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @Escape()
  title: string;

  @ApiProperty({
    description: 'The public URL of the thumbnail image for the article.',
    example: 'https://cdn.example.com/images/iftar-event.jpg',
  })
  @IsUrl()
  @IsNotEmpty()
  thumbnailUrl: string;

  @ApiProperty({
    description: "The author's name.",
    example: 'Al-Faruq Admin',
  })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @Escape()
  author: string;

  @ApiProperty({
    description: 'The category of the news article.',
    example: 'Community Event',
  })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @Escape()
  category: string;

  @ApiProperty({
    description: 'The full content/body of the news article.',
    example: 'Join us this Friday for our annual community iftar...',
  })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @Escape()
  description: string;
}