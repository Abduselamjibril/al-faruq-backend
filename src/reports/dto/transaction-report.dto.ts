// src/reports/dto/transaction-report.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { TransactionDetailDto } from './transaction-detail.dto';

class ReportSummary {
  @ApiProperty()
  startDate: string;
  @ApiProperty()
  endDate: string;
  @ApiProperty()
  totalRevenue: number;
  @ApiProperty()
  totalTransactions: number;
  @ApiProperty()
  alFaruqShare: number;
  @ApiProperty()
  skylinkShare: number;
}

export class TransactionReportDto {
  @ApiProperty({ type: ReportSummary })
  summary: ReportSummary;

  @ApiProperty({ type: [TransactionDetailDto] })
  transactions: TransactionDetailDto[];
}