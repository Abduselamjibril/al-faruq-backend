import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios'; // Import HttpModule for API calls
import { ConfigModule } from '@nestjs/config'; // Import ConfigModule to access .env variables

import { PurchaseService } from './purchase.service';
import { PurchaseController } from './purchase.controller';
import { Purchase } from './entities/purchase.entity';
import { Content } from '../content/entities/content.entity';
import { User } from '../users/entities/user.entity'; // Adjust path if needed
import { PendingTransaction } from './entities/pending-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Purchase, Content, User, PendingTransaction,]),
    HttpModule, // Needed to make HTTP requests to Chapa
    ConfigModule, // Needed to safely access API keys
  ],
  controllers: [PurchaseController],
  providers: [PurchaseService],
})
export class PurchaseModule {}