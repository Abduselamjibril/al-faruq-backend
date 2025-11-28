// src/reports/reports.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, LessThan, Repository } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DailySettlement, SettlementStatus } from './entities/daily-settlement.entity';
import { Purchase } from '../purchase/entities/purchase.entity';
import { TransactionReportDto } from './dto/transaction-report.dto';
import { DailySettlementReportDto } from './dto/daily-settlement-report.dto';

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(DailySettlement)
    private readonly settlementRepository: Repository<DailySettlement>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
  ) {}

  // --- 1. AUTOMATED DAILY SETTLEMENT JOB ---
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
      this.logger.warn(`Settlement for ${yesterdayStr} already exists. Skipping.`);
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
        this.logger.log(`No transactions found for ${yesterdayStr}. Skipping settlement creation.`);
        return;
      }

      const totalRevenue = purchases.reduce(
        (sum, p) => sum + parseFloat(p.pricePaid.toString()),
        0,
      );
      const totalTransactions = purchases.length;
      const alFaruqShare = totalRevenue * 0.7;
      const skylinkShare = totalRevenue * 0.3;

      const newSettlement = this.settlementRepository.create({
        settlementDate: yesterdayStr,
        totalRevenue,
        totalTransactions,
        alFaruqShare,
        skylinkShare,
        status: SettlementStatus.COMPLETED,
      });

      await this.settlementRepository.save(newSettlement);
      this.logger.log(`Successfully created settlement for ${yesterdayStr}. Total Revenue: ${totalRevenue}`);
    } catch (error) {
      this.logger.error(`Failed to run daily settlement for ${yesterdayStr}`, error.stack);
    }
  }

  // --- 2. DETAILED TRANSACTION REPORT ---
  async getTransactionReport(startDate: string, endDate: string): Promise<TransactionReportDto> {
    const transactions = await this.purchaseRepository.find({
      where: {
        createdAt: Between(new Date(startDate), new Date(endDate)),
      },
      relations: ['user', 'content'],
      order: { createdAt: 'DESC' },
    });

    let totalRevenue = 0;
    const transactionDetails = transactions.map((tx) => {
      const amountPaid = parseFloat(tx.pricePaid.toString());
      totalRevenue += amountPaid;

      return {
        purchaseId: tx.id,
        chapaTransactionId: tx.chapaTransactionId,
        purchaseDate: tx.createdAt,
        amountPaid,
        alFaruqShare: amountPaid * 0.7,
        skylinkShare: amountPaid * 0.3,
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

    return {
      summary: {
        startDate,
        endDate,
        totalRevenue,
        totalTransactions: transactions.length,
        alFaruqShare: totalRevenue * 0.7,
        skylinkShare: totalRevenue * 0.3,
      },
      transactions: transactionDetails,
    };
  }

  // --- 3. DAILY SETTLEMENTS REPORT ---
  async getSettlementsReport(startDate: string, endDate: string): Promise<DailySettlementReportDto> {
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
}