// src/purchase/dto/initiate-purchase.dto.ts

import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { AccessType } from '../../common/enums/access-type.enum'; // --- [FIXED] ---

export class InitiatePurchaseDto {
  @ApiProperty({
    description: 'The unique ID of the content being purchased.',
    example: 'a1b2c3d4-e5f6-7890-1234-567890abcdef',
  })
  @IsUUID()
  @IsNotEmpty()
  contentId: string;

  @ApiProperty({
    description: 'The type of access the user wants to purchase (PERMANENT or TEMPORARY).',
    enum: AccessType, // --- [FIXED] ---
    example: AccessType.TEMPORARY,
  })
  @IsEnum(AccessType) // --- [FIXED] ---
  @IsNotEmpty()
  accessType: AccessType;
}