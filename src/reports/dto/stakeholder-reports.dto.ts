import { ApiProperty } from '@nestjs/swagger';
import { PaginationMetaDto } from '../../utils/pagination.dto';

// --- For the Summary Endpoint ---

class TopEarningContentDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  netEarnings: number;
}

export class StakeholderSummaryDto {
  @ApiProperty()
  stakeholderId: string;

  @ApiProperty()
  timeframe: { start: string; end: string };

  @ApiProperty()
  totalGrossSales: number;

  @ApiProperty()
  totalNetEarnings: number;

  @ApiProperty()
  totalTransactions: number;

  @ApiProperty({ type: TopEarningContentDto })
  topEarningContent: TopEarningContentDto | null;
}

// --- For the Ledger Endpoint ---

export class StakeholderLedgerItemDto {
  @ApiProperty()
  date: Date;

  @ApiProperty()
  description: string;

  @ApiProperty()
  contentId: string;

  @ApiProperty({ description: 'The final amount the customer paid.' })
  customerPaid: number;

  @ApiProperty({ description: 'The portion of the payment that was VAT.' })
  vatPortion: number;

  @ApiProperty({ description: 'The fee deducted by Chapa.' })
  transactionFee: number;

  @ApiProperty({
    description: 'The amount available for revenue split after VAT and fees.',
  })
  netForSplit: number;

  @ApiProperty({ description: "This stakeholder's final share of the sale." })
  yourNetEarning: number;
}

export class StakeholderLedgerResponseDto {
  @ApiProperty({ type: PaginationMetaDto })
  meta: PaginationMetaDto;

  @ApiProperty({ type: [StakeholderLedgerItemDto] })
  items: StakeholderLedgerItemDto[];
}