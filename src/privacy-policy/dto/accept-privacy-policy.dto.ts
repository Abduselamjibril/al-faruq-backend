// src/privacy-policy/dto/accept-privacy-policy.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class AcceptPrivacyPolicyDto {
  @ApiPropertyOptional({
    description: 'Information about the user device (e.g., User-Agent).',
    example:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  })
  @IsString()
  @IsOptional()
  deviceInfo?: string;
}