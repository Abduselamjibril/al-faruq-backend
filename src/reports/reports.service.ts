// src/reports/reports.service.ts
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
  DailySettlement,
  SettlementStatus,
} from './entities/daily-settlement.entity';
import { Purchase } from '../purchase/entities/purchase.entity';
import { TransactionReportDto } from './dto/transaction-report.dto';
import { DailySettlementReportDto } from './dto/daily-settlement-report.dto';
import { ReconciliationReportDto } from './dto/reconciliation-report.dto';
import {
  StakeholderLedgerItemDto,
  StakeholderLedgerResponseDto,
  StakeholderSummaryDto,
} from './dto/stakeholder-reports.dto';
import { PaginationMetaDto } from '../utils/pagination.dto';

// Define stakeholders for clarity and maintainability
enum Stakeholder {
  ALFARUQ = 'ALFARUQ',
  SKYLINK = 'SKYLINK',
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  // Define split percentages in one place
  private readonly ALFARUQ_SHARE_PERCENTAGE = 0.7;
  private readonly SKYLINK_SHARE_PERCENTAGE = 0.3;

  constructor(
    @InjectRepository(DailySettlement)
    private readonly settlementRepository: Repository<DailySettlement>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
  ) {}

  // --- 1. AUTOMATED DAILY SETTLEMENT JOB (REFACTORED) ---
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleDailySettlement() {
    this.logger.log('Starting daily settlement job...');

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0]; // 'YYYY-MM-DD'

    const existingSettlement = await this.settlementRepository.findOneBy({
      settlementDate: yesterdayStr,
    });

    if (existingSettlement) {
      this.logger.warn(
        `Settlement for ${yesterdayStr} already exists. Skipping.`,
      );
      return;
    }

    const startDate = new Date(yesterdayStr);
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(yesterdayStr);
    endDate.setUTCHours(23, 59, 59, 999);

    try {
      const purchases = await this.purchaseRepository.find({
        where: {
          createdAt: Between(startDate, endDate),
        },
      });

      if (purchases.length === 0) {
        this.logger.log(
          `No transactions found for ${yesterdayStr}. Skipping settlement creation.`,
        );
        return;
      }

      const totals = purchases.reduce(
        (acc, p) => {
          acc.totalGross += parseFloat(p.grossAmount.toString());
          acc.totalNetSplit += parseFloat(p.netAmountForSplit.toString());
          return acc;
        },
        { totalGross: 0, totalNetSplit: 0 },
      );

      const newSettlement = this.settlementRepository.create({
        settlementDate: yesterdayStr,
        totalRevenue: totals.totalGross, // totalRevenue now represents gross customer payments
        totalTransactions: purchases.length,
        alFaruqShare: totals.totalNetSplit * this.ALFARUQ_SHARE_PERCENTAGE,
        skylinkShare: totals.totalNetSplit * this.SKYLINK_SHARE_PERCENTAGE,
        status: SettlementStatus.COMPLETED,
      });

      await this.settlementRepository.save(newSettlement);
      this.logger.log(
        `Successfully created settlement for ${yesterdayStr}. Total Gross Revenue: ${totals.totalGross}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to run daily settlement for ${yesterdayStr}`,
        error.stack,
      );
    }
  }

  // --- 2. NEW: FINANCIAL RECONCILIATION REPORT (ADMIN) ---
  async getReconciliationReport(
    startDate: string,
    endDate: string,
  ): Promise<ReconciliationReportDto> {
    const purchases = await this.purchaseRepository.find({
      where: { createdAt: Between(new Date(startDate), new Date(endDate)) },
    });

    const report = purchases.reduce(
      (acc, p) => {
        const grossAmount = parseFloat(p.grossAmount.toString());
        const baseAmount = parseFloat(p.baseAmount.toString());
        const vatAmount = parseFloat(p.vatAmount.toString());
        const transactionFee = parseFloat(p.transactionFee.toString());
        const netForSplit = parseFloat(p.netAmountForSplit.toString());

        acc.totalGrossRevenueCollected += grossAmount;
        acc.totalBaseRevenue += baseAmount;
        acc.totalVatCollected += vatAmount;
        acc.totalTransactionFees += transactionFee;
        acc.totalNetRevenueForSplit += netForSplit;

        return acc;
      },
      {
        totalGrossRevenueCollected: 0,
        totalBaseRevenue: 0,
        totalVatCollected: 0,
        totalTransactionFees: 0,
        totalNetRevenueForSplit: 0,
      },
    );

    const alFaruqShare =
      report.totalNetRevenueForSplit * this.ALFARUQ_SHARE_PERCENTAGE;
    const skylinkShare =
      report.totalNetRevenueForSplit * this.SKYLINK_SHARE_PERCENTAGE;

    // The final check for accounting balance
    const discrepancy =
      report.totalNetRevenueForSplit - (alFaruqShare + skylinkShare);

    return {
      timeframe: { start: startDate, end: endDate },
      totalGrossRevenueCollected: report.totalGrossRevenueCollected,
      breakdown: {
        totalBaseRevenue: report.totalBaseRevenue,
        totalVatCollected: report.totalVatCollected,
      },
      totalTransactionFees: report.totalTransactionFees,
      totalNetRevenueForSplit: report.totalNetRevenueForSplit,
      split: {
        alFaruqShare: alFaruqShare,
        skylinkShare: skylinkShare,
      },
      discrepancy: parseFloat(discrepancy.toFixed(4)), // Use toFixed for precision issues
    };
  }

  // --- 3. NEW: STAKEHOLDER DETAILED LEDGER ---
  async getStakeholderLedger(
    stakeholderId: string,
    startDate: string,
    endDate: string,
    page: number,
    limit: number,
  ): Promise<StakeholderLedgerResponseDto> {
    const { share, id } = this._getStakeholderInfo(stakeholderId);
    const skip = (page - 1) * limit;

    const [purchases, totalItems] = await this.purchaseRepository.findAndCount({
      where: { createdAt: Between(new Date(startDate), new Date(endDate)) },
      relations: ['content'],
      order: { createdAt: 'DESC' },
      take: limit,
      skip,
    });

    const items: StakeholderLedgerItemDto[] = purchases.map((p) => {
      const netForSplit = parseFloat(p.netAmountForSplit.toString());
      return {
        date: p.createdAt,
        description: `Sale of '${p.content.title}'`,
        contentId: p.content.id,
        customerPaid: parseFloat(p.grossAmount.toString()),
        vatPortion: parseFloat(p.vatAmount.toString()),
        transactionFee: parseFloat(p.transactionFee.toString()),
        netForSplit: netForSplit,
        yourNetEarning: netForSplit * share,
      };
    });

    const totalPages = Math.ceil(totalItems / limit);
    const meta = new PaginationMetaDto({
      itemCount: items.length,
      totalItems,
      itemsPerPage: limit,
      totalPages,
      currentPage: page,
    });

    return { meta, items };
  }

  // --- 4. LEGACY REPORTS (Can be deprecated or kept for historical comparison) ---
  // Note: These are less accurate as they don't account for VAT/fees correctly.

  async getTransactionReport(
    startDate: string,
    endDate: string,
    page = 1,
    limit = 20,
  ): Promise<TransactionReportDto> {
    const pageNumber = page ?? 1;
    const limitNumber = limit ?? 20;

    const baseQuery = this.purchaseRepository
      .createQueryBuilder('purchase')
      .where('purchase.createdAt BETWEEN :start AND :end', {
        start: new Date(startDate),
        end: new Date(endDate),
      });

    const totalItems = await baseQuery.clone().getCount();

    const totals = await baseQuery
      .clone()
      .select('COALESCE(SUM(purchase.grossAmount), 0)', 'totalRevenue')
      .addSelect('COALESCE(SUM(purchase.netAmountForSplit), 0)', 'totalNetForSplit')
      .getRawOne<{ totalRevenue: string; totalNetForSplit: string }>();

    const transactions = await baseQuery
      .clone()
      .leftJoinAndSelect('purchase.user', 'user')
      .leftJoinAndSelect('purchase.content', 'content')
      .orderBy('purchase.createdAt', 'DESC')
      .skip((pageNumber - 1) * limitNumber)
      .take(limitNumber)
      .getMany();

    const totalRevenue = parseFloat(totals?.totalRevenue ?? '0');
    const totalNetForSplit = parseFloat(totals?.totalNetForSplit ?? '0');

    const transactionDetails = transactions.map((tx) => {
      const amountPaid = parseFloat(tx.grossAmount.toString());
      const netForSplit = parseFloat(tx.netAmountForSplit.toString());

      return {
        purchaseId: tx.id,
        chapaTransactionId: tx.chapaTransactionId,
        purchaseDate: tx.createdAt,
        amountPaid,
        alFaruqShare: netForSplit * this.ALFARUQ_SHARE_PERCENTAGE,
        skylinkShare: netForSplit * this.SKYLINK_SHARE_PERCENTAGE,
        content: {
          id: tx.content.id,
          title: tx.content.title,
        },
        user: {
          id: tx.user.id,
          email: tx.user.email,
        },
      };
    });

    const meta = new PaginationMetaDto({
      itemCount: transactionDetails.length,
      totalItems,
      itemsPerPage: limitNumber,
      totalPages: Math.ceil(totalItems / limitNumber) || 1,
      currentPage: pageNumber,
    });

    return {
      summary: {
        startDate,
        endDate,
        totalRevenue,
        totalTransactions: totalItems,
        alFaruqShare: totalNetForSplit * this.ALFARUQ_SHARE_PERCENTAGE,
        skylinkShare: totalNetForSplit * this.SKYLINK_SHARE_PERCENTAGE,
      },
      meta,
      transactions: transactionDetails,
    };
  }

  async getSettlementsReport(
    startDate: string,
    endDate: string,
  ): Promise<DailySettlementReportDto> {
    const start = startDate.split('T')[0];
    const end = endDate.split('T')[0];

    const settlements = await this.settlementRepository.find({
      where: {
        settlementDate: Between(start, end),
        status: SettlementStatus.COMPLETED,
      },
      order: { settlementDate: 'DESC' },
    });

    const summary = settlements.reduce(
      (acc, record) => {
        acc.totalAlFaruqShare += parseFloat(record.alFaruqShare.toString());
        acc.totalSkylinkShare += parseFloat(record.skylinkShare.toString());
        return acc;
      },
      { totalAlFaruqShare: 0, totalSkylinkShare: 0 },
    );

    return {
      summary: {
        startDate,
        endDate,
        ...summary,
      },
      dailyRecords: settlements.map((s) => ({
        settlementDate: s.settlementDate,
        totalRevenue: parseFloat(s.totalRevenue.toString()),
        totalTransactions: s.totalTransactions,
        alFaruqShare: parseFloat(s.alFaruqShare.toString()),
        skylinkShare: parseFloat(s.skylinkShare.toString()),
      })),
    };
  }

  // --- Private Helper ---
  private _getStakeholderInfo(stakeholderId: string): {
    share: number;
    id: Stakeholder;
  } {
    if (stakeholderId.toUpperCase() === Stakeholder.ALFARUQ) {
      return { share: this.ALFARUQ_SHARE_PERCENTAGE, id: Stakeholder.ALFARUQ };
    }
    if (stakeholderId.toUpperCase() === Stakeholder.SKYLINK) {
      return { share: this.SKYLINK_SHARE_PERCENTAGE, id: Stakeholder.SKYLINK };
    }
    throw new NotFoundException(
      `Stakeholder with ID '${stakeholderId}' not found.`,
    );
  }
}