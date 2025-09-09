// src/auth/dto/change-password.dto.ts

import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Match } from '../decorators/match.decorator'; // <-- IMPORT our new decorator

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  newPassword: string;
  
  @IsString()
  @Match('newPassword', { message: 'Passwords do not match' }) // <-- USE the new decorator
  confirmPassword: string;
}