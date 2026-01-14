// src/reports/reports.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetReportQueryDto } from './dto/get-report-query.dto';
import { TransactionReportDto } from './dto/transaction-report.dto';
import { DailySettlementReportDto } from './dto/daily-settlement-report.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../database/seed.service';

@ApiTags('Reports (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('transactions')
  @Permissions(PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get a detailed transaction report (Admin Only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all transactions within the date range.',
    type: TransactionReportDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid date range provided.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  getTransactionReport(@Query() query: GetReportQueryDto) {
    return this.reportsService.getTransactionReport(query.startDate, query.endDate);
  }

  @Get('settlements')
  @Permissions(PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get a daily settlement report (Admin Only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of daily financial summaries.',
    type: DailySettlementReportDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid date range provided.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  getSettlementsReport(@Query() query: GetReportQueryDto) {
    return this.reportsService.getSettlementsReport(query.startDate, query.endDate);
  }
}