// src/purchase/purchase.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';
import { Purchase } from './entities/purchase.entity';
import { Content } from '../content/entities/content.entity';
import { User } from '../users/entities/user.entity';
import { PendingTransaction } from './entities/pending-transaction.entity';

// --- [FIX 1] IMPORT THE MISSING ENTITIES AND THE NEW MODULE ---
import { ContentPricing } from '../content/entities/content-pricing.entity';
import { UserContentEntitlement } from './entities/user-content-entitlement.entity';
import { EntitlementModule } from '../entitlement/entitlement.module';

@Module({
  imports: [
    // --- [FIX 2] REGISTER THE MISSING ENTITIES SO THEIR REPOSITORIES CAN BE INJECTED ---
    TypeOrmModule.forFeature([
      Purchase,
      Content,
      User,
      PendingTransaction,
      ContentPricing, // <-- This was the main cause of the error
      UserContentEntitlement, // <-- This was also needed by PurchaseService
    ]),
    HttpModule,
    ConfigModule,
    // --- [FIX 3] IMPORT THE MODULE THAT EXPORTS THE ENTITLEMENTSERVICE ---
    EntitlementModule,
  ],
  controllers: [PurchaseController],
  providers: [PurchaseService],
})
export class PurchaseModule {}