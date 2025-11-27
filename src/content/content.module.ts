// src/content/content.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from './entities/content.entity';
import { PricingTier } from '../pricing/entities/pricing-tier.entity';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Content, PricingTier])],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService], // <-- ADD THIS LINE
})
export class ContentModule {}