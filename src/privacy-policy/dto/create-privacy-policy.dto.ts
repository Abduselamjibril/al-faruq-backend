// src/privacy-policy/dto/create-privacy-policy.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsString,
  IsNotEmpty,
  IsDate,
  IsOptional,
  IsBoolean,
  MinLength,
} from 'class-validator';

export class CreatePrivacyPolicyDto {
  @ApiProperty({
    description: 'The title of the privacy policy document.',
    example: 'Privacy Policy Q1 2024',
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  title: string;

  @ApiProperty({
    description: 'The unique version identifier for the policy (e.g., semantic versioning).',
    example: '1.0.1',
  })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiProperty({
    description: 'A brief description or summary of the changes in this version.',
    example: 'Updated terms regarding data usage and analytics.',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'The date from which this policy becomes effective.',
    example: '2024-09-01T00:00:00.000Z',
  })
  @Transform(({ value }) => new Date(value))
  @IsDate()
  effectiveDate: Date;

  @ApiProperty({
    description: 'Set to true to make this the publicly visible policy. Only one can be active at a time.',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive: boolean = false;

  @ApiProperty({
    description: 'Set to true to force users to accept this policy. Only one can be mandatory at a time.',
    example: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isMandatory: boolean = false;
}