import { IsNotEmpty, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleMobileLoginDto {
  @ApiProperty({
    description: 'The Google ID Token obtained from the mobile app',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjZm...',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  token: string;
}