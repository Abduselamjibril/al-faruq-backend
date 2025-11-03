// src/auth/dto/change-password.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Match } from '../decorators/match.decorator';

export class ChangePasswordDto {
  @ApiProperty({
    description: "User's current password",
    example: 'OldP@ssword123',
  })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({
    description: "User's new password (at least 8 characters)",
    example: 'NewStr0ngP@ssword!',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;

  @ApiProperty({
    description: 'Confirmation of the new password, must match newPassword',
    example: 'NewStr0ngP@ssword!',
  })
  @IsString()
  @Match('newPassword', { message: 'Passwords do not match' })
  confirmPassword: string;
}