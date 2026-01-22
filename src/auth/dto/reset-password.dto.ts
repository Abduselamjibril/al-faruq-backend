// src/auth/dto/reset-password.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Match } from '../decorators/match.decorator';
import { IsStrongPassword } from '../decorators/is-strong-password.decorator';

export class ResetPasswordDto {
  @ApiProperty({
    description: "The user's email address",
    example: 'john.doe@example.com',
  })
    @IsEmail()
    @IsNotEmpty()
    @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  email: string;

  @ApiProperty({
    description: 'The One-Time Password (OTP) sent to the user email',
    example: '123456',
  })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  otp: string;

  @ApiProperty({
    description: "The user's new password (at least 8 characters)",
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