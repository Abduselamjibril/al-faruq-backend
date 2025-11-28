// src/reports/reports.controller.ts

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/entities/role.entity';
import { GetReportQueryDto } from './dto/get-report-query.dto';
import { TransactionReportDto } from './dto/transaction-report.dto';
import { DailySettlementReportDto } from './dto/daily-settlement-report.dto';

@ApiTags('Reports (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('transactions')
  @ApiOperation({ summary: 'Get a detailed transaction report' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all transactions within the date range.',
    type: TransactionReportDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid date range provided.' })
  getTransactionReport(@Query() query: GetReportQueryDto) {
    return this.reportsService.getTransactionReport(query.startDate, query.endDate);
  }

  @Get('settlements')
  @ApiOperation({ summary: 'Get a daily settlement report' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of daily financial summaries.',
    type: DailySettlementReportDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid date range provided.' })
  getSettlementsReport(@Query() query: GetReportQueryDto) {
    return this.reportsService.getSettlementsReport(query.startDate, query.endDate);
  }
}