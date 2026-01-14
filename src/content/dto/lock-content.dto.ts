// src/content/dto/lock-content.dto.ts

import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class TemporaryPriceDto {
  @ApiProperty({
    description: 'The base price for a temporary rental.',
    example: 40.0,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description: 'The duration of the rental in days.',
    example: 30,
  })
  @IsInt()
  @Min(1)
  durationDays: number;

  @ApiProperty({
    description:
      'If true, VAT will be added on top of the price (customer pays). If false, VAT is included in the price (platform pays).',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isVatAdded?: boolean = true;
}

class PermanentPriceDto {
  @ApiProperty({
    description: 'The base price for a permanent, non-expiring purchase.',
    example: 100.0,
  })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty({
    description:
      'If true, VAT will be added on top of the price (customer pays). If false, VAT is included in the price (platform pays).',
    example: true,
    default: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isVatAdded?: boolean = true;
}

export class LockContentDto {
  @ApiPropertyOptional({
    description:
      'The pricing details for a permanent, non-expiring purchase.',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => PermanentPriceDto)
  @IsOptional()
  permanentPrice?: PermanentPriceDto;

  @ApiPropertyOptional({
    description: 'The pricing details for a temporary, expiring rental.',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => TemporaryPriceDto)
  @IsOptional()
  temporaryPrice?: TemporaryPriceDto;
}