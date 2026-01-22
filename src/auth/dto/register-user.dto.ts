// src/auth/dto/register-user.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { IsStrongPassword } from '../decorators/is-strong-password.decorator';
import { Match } from '../decorators/match.decorator';
import { IsTrue } from '../decorators/is-true.decorator'; // <-- IMPORT THE NEW DECORATOR
import { escapeHtml } from '../../common/utils/sanitize.util';

export class RegisterUserDto {
  @ApiProperty({
    description: "User's first name",
    example: 'John',
  })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @Transform(({ value }) => typeof value === 'string' ? escapeHtml(value) : value)
  firstName: string;

  @ApiProperty({
    description: "User's last name",
    example: 'Doe',
  })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @Transform(({ value }) => typeof value === 'string' ? escapeHtml(value) : value)
  lastName: string;

  @ApiProperty({
    description: "User's unique phone number",
    example: '1234567890',
  })
    @IsString()
    @IsNotEmpty()
    @Transform(({ value }) => typeof value === 'string' ? value.replace(/\D/g, '').trim() : value)
    @Transform(({ value }) => typeof value === 'string' ? escapeHtml(value) : value)
  phoneNumber: string;

  @ApiProperty({
    description: "User's unique email address (optional)",
    example: 'john.doe@example.com',
    required: false,
  })
    @IsEmail()
    @IsOptional()
    @Transform(({ value }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  email?: string;

  @ApiProperty({
    description: "User's password (at least 8 characters)",
    example: 'Str0ngP@ssword!',
  })
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters long' })
    @IsStrongPassword({ message: 'Password must include uppercase, lowercase, number, and special character.' })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
  password: string;

  @ApiProperty({
    description: 'Password confirmation, must match password',
    example: 'Str0ngP@ssword!',
  })
    @IsString()
    @MinLength(8)
    @IsStrongPassword({ message: 'Password must include uppercase, lowercase, number, and special character.' })
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    @Match('password', { message: 'Passwords do not match' })
  confirmPassword: string;

}