// src/devices/dto/register-device.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';
import { Trim, Escape } from 'class-sanitizer';

export class RegisterDeviceDto {
  @ApiProperty({
    description: 'The Firebase Cloud Messaging (FCM) token for the device.',
    example: 'bk3RNwTe3H0:CI2k_HHwgIpoDKCIZvvDMExUd...',
  })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @Escape()
  fcmToken: string;
}