// src/content/content.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from './entities/content.entity';
import { PricingTier } from '../pricing/entities/pricing-tier.entity';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { Language } from './entities/language.entity';
// --- [REMOVED] The 'AudioTrack' import is no longer needed. ---

@Module({
  // --- [REMOVED] 'AudioTrack' is removed from the TypeOrmModule registration. ---
  imports: [TypeOrmModule.forFeature([Content, PricingTier, Language])],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}