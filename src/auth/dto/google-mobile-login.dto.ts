import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GoogleMobileLoginDto {
  @ApiProperty({ description: 'The ID Token received from Google on the mobile device' })
  @IsString()
  @IsNotEmpty()
  idToken: string;
}