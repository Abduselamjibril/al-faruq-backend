import { IsNotEmpty, IsString } from 'class-validator';
import { Trim, Escape } from 'class-sanitizer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTermsOfServiceDto {
  @ApiProperty({
    description: 'The unique version identifier for the ToS',
    example: '1.1.0',
  })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @Escape()
  version: string;

  @ApiProperty({
    description: 'The full content of the ToS, can include HTML or Markdown',
    example: '<h1>Terms of Service</h1><p>You agree to these terms...</p>',
  })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @Escape()
  content: string;
}