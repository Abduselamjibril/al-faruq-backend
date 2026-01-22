// src/auth/dto/change-password.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Match } from '../decorators/match.decorator';
import { IsStrongPassword } from '../decorators/is-strong-password.decorator';

export class ChangePasswordDto {
  @ApiProperty({
    description: "User's current password",
    example: 'OldP@ssword123',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  currentPassword: string;

  @ApiProperty({
    description: "User's new password (at least 8 characters)",
    example: 'NewStr0ngP@ssword!',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  @IsStrongPassword({ message: 'Password must include uppercase, lowercase, number, and special character.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  newPassword: string;

  @ApiProperty({
    description: 'Confirmation of the new password, must match newPassword',
    example: 'NewStr0ngP@ssword!',
  })
  @IsString()
  @IsStrongPassword({ message: 'Password must include uppercase, lowercase, number, and special character.' })
  @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  @Match('newPassword', { message: 'Passwords do not match' })
  confirmPassword: string;
}