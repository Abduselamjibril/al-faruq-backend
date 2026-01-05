// src/content/dto/set-pricing.dto.ts

import { IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SetPricingDto {
  @ApiProperty({
    description: 'The price for a single unit of this content (e.g., one episode).',
    example: 50.0,
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  price: number;
}