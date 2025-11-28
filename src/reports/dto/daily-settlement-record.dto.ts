// src/reports/dto/daily-settlement-record.dto.ts

import { ApiProperty } from '@nestjs/swagger';

export class DailySettlementRecordDto {
  @ApiProperty()
  settlementDate: string;

  @ApiProperty()
  totalRevenue: number;

  @ApiProperty()
  totalTransactions: number;

  @ApiProperty()
  alFaruqShare: number;

  @ApiProperty()
  skylinkShare: number;
}