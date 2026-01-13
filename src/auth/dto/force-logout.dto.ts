// src/auth/dto/force-logout.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsUUID } from 'class-validator';

export class ForceLogoutDto {
  @ApiProperty({
    description: 'The UUID of the user to log out from all devices.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  @IsNotEmpty()
  userId: string;
}