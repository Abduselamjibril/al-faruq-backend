// src/feed/feed-access.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EntitlementService } from '../entitlement/entitlement.service';
import { AccessStatusDto } from './dto/access-status.dto';
import {
  ContentPricing,
  ContentPricingScope,
} from '../content/entities/content-pricing.entity';
import { Content } from '../content/entities/content.entity';

@Injectable()
export class FeedAccessService {
  constructor(
    private readonly entitlementService: EntitlementService,
    @InjectRepository(ContentPricing)
    private readonly pricingRepository: Repository<ContentPricing>,
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
  ) {}

  async getAccessStatus(
    contentId: string,
    userId: number,
  ): Promise<AccessStatusDto> {
    const content = await this.contentRepository.findOneBy({ id: contentId });
    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found.`);
    }

    // Check if the user has a valid entitlement
    const entitlement = await this.entitlementService.checkUserAccess(
      userId,
      contentId,
    );

    if (entitlement) {
      // User has access
      return {
        hasAccess: true,
        accessType: entitlement.accessType,
        expiresAt: entitlement.validUntil,
        action: 'WATCH',
      };
    }

    // User does not have access, check if it's unlockable
    const pricing = await this.pricingRepository.findOneBy({
      contentId,
      contentType: content.type as unknown as ContentPricingScope,
      isActive: true,
    });

    if (pricing) {
      // Content is locked and has a price, so it's unlockable
      return {
        hasAccess: false,
        action: 'UNLOCK',
        unlockPrice: parseFloat(pricing.price.toString()),
      };
    }

    // If there's no price and no entitlement, access is simply denied.
    // This case shouldn't happen for `isLocked=true` content but is a fallback.
    throw new NotFoundException(
      'Content access status could not be determined.',
    );
  }
}