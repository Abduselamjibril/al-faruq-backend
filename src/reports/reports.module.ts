// src/reports/reports.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { DailySettlement } from './entities/daily-settlement.entity';
import { Purchase } from '../purchase/entities/purchase.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DailySettlement, Purchase])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}