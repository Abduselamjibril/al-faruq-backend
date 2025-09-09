// src/auth/dto/register-user.dto.ts

import { IsBoolean, IsEmail, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Match } from '../decorators/match.decorator'; // <-- IMPORT our new decorator

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsString()
  @MinLength(8)
  @Match('password', { message: 'Passwords do not match' }) // <-- USE the new decorator
  confirmPassword: string;

  @IsBoolean({ message: 'You must agree to the terms and privacy policy' })
  agreedToTerms: boolean;
}