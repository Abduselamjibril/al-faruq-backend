import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleMobileLoginDto {
  @ApiProperty({
    description: 'The Google ID Token obtained from the mobile app',
    example: 'eyJhbGciOiJSUzI1NiIsImtpZCI6IjZm...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;
}