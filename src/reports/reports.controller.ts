// src/reports/reports.controller.ts

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetReportQueryDto } from './dto/get-report-query.dto';
import { TransactionReportDto } from './dto/transaction-report.dto';
import { DailySettlementReportDto } from './dto/daily-settlement-report.dto';
import { GetTransactionReportQueryDto } from './dto/get-transaction-report-query.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../database/seed.service';
import { ReconciliationReportDto } from './dto/reconciliation-report.dto';
import { StakeholderLedgerResponseDto } from './dto/stakeholder-reports.dto';
import { GetStakeholderLedgerQueryDto } from './dto/get-stakeholder-ledger-query.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  // --- NEW ADMIN-ONLY ENDPOINTS ---

  @Get('reconciliation')
  @Permissions(PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({ summary: 'Get a financial reconciliation report (Admin Only)' })
  @ApiResponse({
    status: 200,
    description:
      'Returns a detailed breakdown of all revenue, fees, and splits to ensure financial balance.',
    type: ReconciliationReportDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid date range provided.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  getReconciliationReport(@Query() query: GetReportQueryDto) {
    return this.reportsService.getReconciliationReport(
      query.startDate,
      query.endDate,
    );
  }

  // --- NEW STAKEHOLDER ENDPOINT ---

  @Get('stakeholders/:stakeholderId/ledger')
  @Permissions(PERMISSIONS.REPORTS_VIEW) // Or a new, more specific permission
  @ApiOperation({
    summary:
      "Get a detailed, paginated financial ledger for a specific stakeholder (e.g., 'alfaruq' or 'skylink').",
  })
  @ApiParam({
    name: 'stakeholderId',
    description: "The identifier for the stakeholder. Use 'alfaruq' or 'skylink'.",
    enum: ['alfaruq', 'skylink'],
  })
  @ApiResponse({
    status: 200,
    description: "Returns a paginated list of the stakeholder's earnings.",
    type: StakeholderLedgerResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  @ApiResponse({ status: 404, description: 'Stakeholder ID not found.' })
  getStakeholderLedger(
    @Param('stakeholderId') stakeholderId: string,
    @Query() query: GetStakeholderLedgerQueryDto,
  ) {
    return this.reportsService.getStakeholderLedger(
      stakeholderId,
      query.startDate,
      query.endDate,
      query.page,
      query.limit,
    );
  }

  // --- LEGACY ENDPOINTS ---

  @Get('transactions')
  @Permissions(PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({
    summary: 'Get a detailed transaction report (Admin Only) [Legacy]',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all transactions within the date range.',
    type: TransactionReportDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid date range provided.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  getTransactionReport(@Query() query: GetTransactionReportQueryDto) {
    return this.reportsService.getTransactionReport(
      query.startDate,
      query.endDate,
      query.page,
      query.limit,
    );
  }

  @Get('settlements')
  @Permissions(PERMISSIONS.REPORTS_VIEW)
  @ApiOperation({
    summary: 'Get a daily settlement report (Admin Only) [Legacy]',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of daily financial summaries.',
    type: DailySettlementReportDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid date range provided.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  getSettlementsReport(@Query() query: GetReportQueryDto) {
    return this.reportsService.getSettlementsReport(
      query.startDate,
      query.endDate,
    );
  }
}