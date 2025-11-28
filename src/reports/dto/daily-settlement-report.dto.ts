// src/reports/dto/daily-settlement-report.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { DailySettlementRecordDto } from './daily-settlement-record.dto';

class SettlementReportSummary {
  @ApiProperty()
  startDate: string;
  @ApiProperty()
  endDate: string;
  @ApiProperty()
  totalAlFaruqShare: number;
  @ApiProperty()
  totalSkylinkShare: number;
}

export class DailySettlementReportDto {
  @ApiProperty({ type: SettlementReportSummary })
  summary: SettlementReportSummary;

  @ApiProperty({ type: [DailySettlementRecordDto] })
  dailyRecords: DailySettlementRecordDto[];
}