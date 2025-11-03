// src/notifications/dto/create-notification.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty({
    description: 'The title of the notification.',
    example: 'New Series Added!',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @ApiProperty({
    description: 'The main message body of the notification.',
    example: 'Sheep Season 1 is now available for streaming!',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  message: string;
}