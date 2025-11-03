// src/reminders/dto/update-reminder.dto.ts

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class UpdateReminderDto {
  @ApiPropertyOptional({
    description: 'Enable or disable this reminder.',
    example: true,
  })
  @IsBoolean()
  @IsOptional()
  isEnabled?: boolean;

  @ApiPropertyOptional({
    description: 'The notification message to be sent.',
    example: "Don't forget to read Surah Al-Kahf. Jumu'ah Mubarak!",
  })
  @IsString()
  @IsOptional()
  message?: string;

  @ApiPropertyOptional({
    description: 'The time of day to send the reminder (24-hour HH:mm format).',
    example: '12:30',
  })
  @IsString()
  @Matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:mm format (e.g., 09:30 or 18:00)',
  })
  @IsOptional()
  time?: string;
}