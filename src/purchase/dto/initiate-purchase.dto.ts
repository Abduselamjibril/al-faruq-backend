// src/purchase/dto/initiate-purchase.dto.ts

import { IsInt, IsNotEmpty, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger'; // --- IMPORT THIS ---

export class InitiatePurchaseDto {
  @ApiProperty({
    description: 'The unique ID of the content being purchased.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  @IsNotEmpty()
  contentId: string;

  @ApiProperty({
    description: 'The total number of days the user wants to purchase access for.',
    example: 30,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  durationDays: number;
}