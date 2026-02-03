// src/utils/pagination.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsArray } from 'class-validator';

interface PaginationMetaParameters {
  itemCount: number;
  totalItems: number;
  itemsPerPage: number;
  totalPages: number;
  currentPage: number;
}

export class PaginationMetaDto {
  @ApiProperty({ description: 'Total number of items available.' })
  totalItems: number;

  @ApiProperty({ description: 'Number of items on the current page.' })
  itemCount: number;

  @ApiProperty({ description: 'Number of items requested per page.' })
  itemsPerPage: number;

  @ApiProperty({ description: 'Total number of pages available.' })
  totalPages: number;

  @ApiProperty({ description: 'The current page number.' })
  currentPage: number;

  constructor({
    itemCount,
    totalItems,
    itemsPerPage,
    totalPages,
    currentPage,
  }: PaginationMetaParameters) {
    this.totalItems = totalItems;
    this.itemCount = itemCount;
    this.itemsPerPage = itemsPerPage;
    this.totalPages = totalPages;
    this.currentPage = currentPage;
  }
}

export class PaginationResponseDto<T> {
  @IsArray()
  @ApiProperty({ isArray: true })
  data: T[];

  @ApiProperty({ type: () => PaginationMetaDto })
  meta: PaginationMetaDto;

  constructor(data: T[], meta: PaginationMetaDto) {
    this.data = data;
    this.meta = meta;
    //asDAtA
  }
}