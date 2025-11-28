// src/reports/dto/transaction-detail.dto.ts

import { ApiProperty } from '@nestjs/swagger';

class UserInfo {
  @ApiProperty()
  id: number;
  @ApiProperty()
  email: string;
}

class ContentInfo {
  @ApiProperty()
  id: string;
  @ApiProperty()
  title: string;
}

export class TransactionDetailDto {
  @ApiProperty()
  purchaseId: string;

  @ApiProperty()
  chapaTransactionId: string;

  @ApiProperty()
  purchaseDate: Date;

  @ApiProperty()
  amountPaid: number;

  @ApiProperty()
  alFaruqShare: number;

  @ApiProperty()
  skylinkShare: number;

  @ApiProperty({ type: ContentInfo })
  content: ContentInfo;

  @ApiProperty({ type: UserInfo })
  user: UserInfo;
}