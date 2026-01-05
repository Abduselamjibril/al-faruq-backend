// src/purchase/dto/unlock-content.dto.ts

import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { EntitlementAccessType } from '../entities/user-content-entitlement.entity';

export class UnlockContentDto {
  @ApiProperty({
    description: 'The desired type of access to purchase.',
    enum: EntitlementAccessType,
    example: EntitlementAccessType.PERMANENT,
  })
  @IsEnum(EntitlementAccessType)
  @IsNotEmpty()
  accessType: EntitlementAccessType;
}