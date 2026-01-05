// src/feed/dto/access-status.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { EntitlementAccessType } from '../../purchase/entities/user-content-entitlement.entity';

export class AccessStatusDto {
  @ApiProperty({
    description: 'Indicates if the user has access to the content.',
    example: true,
  })
  hasAccess: boolean;

  @ApiProperty({
    description: 'The type of access the user has.',
    enum: EntitlementAccessType,
    example: EntitlementAccessType.TEMPORARY,
    required: false,
  })
  accessType?: EntitlementAccessType;

  @ApiProperty({
    description: 'The timestamp when the access expires (for TEMPORARY access).',
    example: '2025-08-30T23:59:59Z',
    required: false,
  })
  expiresAt?: Date | null;

  @ApiProperty({
    description: 'The recommended action for the UI to take.',
    example: 'WATCH',
  })
  action: 'WATCH' | 'UNLOCK';

  @ApiProperty({
    description: 'The price to unlock the content if access is denied.',
    example: 50.0,
    required: false,
  })
  unlockPrice?: number;
}