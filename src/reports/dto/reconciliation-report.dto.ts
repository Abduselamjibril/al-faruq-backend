import { ApiProperty } from '@nestjs/swagger';

class ReconciliationTimeframe {
  @ApiProperty()
  start: string;

  @ApiProperty()
  end: string;
}

class RevenueBreakdown {
  @ApiProperty()
  totalBaseRevenue: number;

  @ApiProperty()
  totalVatCollected: number;
}

class RevenueSplit {
  @ApiProperty()
  alFaruqShare: number;

  @ApiProperty()
  skylinkShare: number;
}

export class ReconciliationReportDto {
  @ApiProperty({ type: ReconciliationTimeframe })
  timeframe: ReconciliationTimeframe;

  @ApiProperty()
  totalGrossRevenueCollected: number;

  @ApiProperty({ type: RevenueBreakdown })
  breakdown: RevenueBreakdown;

  @ApiProperty()
  totalTransactionFees: number;

  @ApiProperty()
  totalNetRevenueForSplit: number;

  @ApiProperty({ type: RevenueSplit })
  split: RevenueSplit;

  @ApiProperty({
    description: 'Should always be 0. A non-zero value indicates an accounting imbalance.',
  })
  discrepancy: number;
}