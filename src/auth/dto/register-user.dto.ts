// src/auth/dto/register-user.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { Match } from '../decorators/match.decorator';
import { IsTrue } from '../decorators/is-true.decorator'; // <-- IMPORT THE NEW DECORATOR

export class RegisterUserDto {
  @ApiProperty({
    description: "User's first name",
    example: 'John',
  })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({
    description: "User's last name",
    example: 'Doe',
  })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    description: "User's unique phone number",
    example: '1234567890',
  })
  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @ApiProperty({
    description: "User's unique email address (optional)",
    example: 'john.doe@example.com',
    required: false,
  })
  @IsEmail()
  @IsNotEmpty() // <-- REPLACED @IsOptional with @IsNotEmpty
  email: string; // <-- REMOVED optional '?' marker

  @ApiProperty({
    description: "User's password (at least 8 characters)",
    example: 'Str0ngP@ssword!',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({
    description: 'Password confirmation, must match password',
    example: 'Str0ngP@ssword!',
  })
  @IsString()
  @MinLength(8)
  @Match('password', { message: 'Passwords do not match' })
  confirmPassword: string;

  @ApiProperty({
    description: 'Must be true to indicate agreement to terms and conditions',
    example: true,
  })
  @IsTrue({ message: 'You must agree to the terms and privacy policy' }) // <-- REPLACE @IsBoolean WITH @IsTrue
  agreedToTerms: boolean;
}