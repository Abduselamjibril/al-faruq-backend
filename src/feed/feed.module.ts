// src/feed/feed.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeedService } from './feed.service';
import { FeedController } from './feed.controller';
import { Content } from '../content/entities/content.entity';
import { EntitlementModule } from '../entitlement/entitlement.module';
import { UserContentEntitlement } from '../purchase/entities/user-content-entitlement.entity';

import { ContentPricing } from '../content/entities/content-pricing.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Content,
      UserContentEntitlement,
      ContentPricing,
    ]),
    EntitlementModule,
  ],
  controllers: [FeedController],
  
  providers: [FeedService],
})
export class FeedModule {}