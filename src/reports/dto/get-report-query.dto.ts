// src/reports/dto/get-report-query.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';

export class GetReportQueryDto {
  @ApiProperty({
    description: 'The start date for the report (ISO 8601 format).',
    example: '2023-11-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'The end date for the report (ISO 8601 format).',
    example: '2023-11-30T23:59:59.999Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}