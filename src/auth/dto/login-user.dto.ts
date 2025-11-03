// src/auth/dto/login-user.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginUserDto {
  @ApiProperty({
    description: "User's email or phone number",
    example: 'john.doe@example.com',
  })
  @IsString()
  @IsNotEmpty()
  loginIdentifier: string;

  @ApiProperty({
    description: "User's password",
    example: 'Str0ngP@ssword!',
  })
  @IsString()
  @IsNotEmpty()
  password: string;
}