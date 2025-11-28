// src/content/dto/create-audio-track.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUUID, IsUrl } from 'class-validator';

export class CreateAudioTrackDto {
  @ApiProperty({
    description: 'The UUID of the language for this audio track.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  @IsNotEmpty()
  languageId: string;

  @ApiProperty({
    description: "The public URL of the uploaded audio file (from the '/upload/audio' endpoint).",
    example: 'https://res.cloudinary.com/demo/video/upload/v1588252293/alfaruq/audio/sample.mp3',
  })
  @IsUrl()
  @IsNotEmpty()
  audioUrl: string;
}