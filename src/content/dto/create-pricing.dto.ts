import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AdditionalTier } from '../../pricing/entities/pricing-tier.entity';

class AdditionalTierDto implements AdditionalTier {
  @IsInt()
  @Min(1)
  days: number;

  @IsNumber()
  @Min(0)
  price: number;
}

export class CreatePricingDto {
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  basePrice: number;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  baseDurationDays: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AdditionalTierDto)
  additionalTiers: AdditionalTierDto[];
}