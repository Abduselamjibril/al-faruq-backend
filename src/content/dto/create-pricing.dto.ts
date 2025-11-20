// src/content/dto/create-pricing.dto.ts

import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger'; // --- IMPORT THIS ---
import { AdditionalTier } from '../../pricing/entities/pricing-tier.entity';

class AdditionalTierDto implements AdditionalTier {
  @ApiProperty({
    description: 'The number of days for this additional pricing tier.',
    example: 30,
  })
  @IsInt()
  @Min(1)
  days: number;

  @ApiProperty({
    description: 'The price for this additional tier.',
    example: 150.0,
  })
  @IsNumber()
  @Min(0)
  price: number;
}

export class CreatePricingDto {
  @ApiProperty({
    description: 'The base price for the minimum rental duration.',
    example: 100.0,
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  basePrice: number;

  @ApiProperty({
    description: 'The minimum rental duration in days for the base price.',
    example: 7,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty()
  baseDurationDays: number;

  @ApiProperty({
    description: 'A list of additional pricing tiers for longer durations.',
    type: [AdditionalTierDto],
    example: [
      { days: 30, price: 150 },
      { days: 90, price: 400 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalTierDto)
  additionalTiers: AdditionalTierDto[];
}