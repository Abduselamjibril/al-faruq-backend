// src/content/dto/lock-content.dto.ts

import {
  IsInt,
  IsNotEmptyObject,
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
    description: 'The price for a temporary rental.',
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
}

export class LockContentDto {
  @ApiPropertyOptional({
    description: 'The price for a permanent, non-expiring purchase.',
    example: 100.0,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  permanentPrice?: number;

  @ApiPropertyOptional({
    description: 'The pricing details for a temporary, expiring rental.',
  })
  @IsObject()
  @ValidateNested()
  @Type(() => TemporaryPriceDto)
  @IsOptional()
  temporaryPrice?: TemporaryPriceDto;
}