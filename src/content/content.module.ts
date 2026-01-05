// src/content/content.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from './entities/content.entity';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { Language } from './entities/language.entity';
import { ContentPricing } from './entities/content-pricing.entity'; // --- [NEW] IMPORT ContentPricing ---

@Module({
  // --- [CHANGED] Replaced PricingTier with ContentPricing ---
  imports: [TypeOrmModule.forFeature([Content, ContentPricing, Language])],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}