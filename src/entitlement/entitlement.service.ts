// src/entitlement/entitlement.service.ts

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository, In, LessThan } from 'typeorm';
import { UserContentEntitlement } from '../purchase/entities/user-content-entitlement.entity';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AccessType } from '../common/enums/access-type.enum';
import { Content } from '../content/entities/content.entity';

@Injectable()
export class EntitlementService {
  private readonly logger = new Logger(EntitlementService.name);

  constructor(
    @InjectRepository(UserContentEntitlement)
    private readonly entitlementRepository: Repository<UserContentEntitlement>,
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
  ) {}

  /**
   * Overloaded method. Checks access by either querying the DB or checking a pre-fetched set of IDs.
   * @param userId The ID of the user. Pass an empty string if using the pre-fetched set.
   * @param contentId The ID of the content the user wants to access.
   * @param entitledContentIds (Optional) A pre-fetched Set of content IDs the user is entitled to.
   * @returns The valid entitlement record if access is granted, otherwise null.
   */
  async checkUserAccess(
    userId: string,
    contentId: string,
    entitledContentIds?: Set<string>,
  ): Promise<UserContentEntitlement | boolean | null> {
    // Step 1: Fetch the content and its full parent hierarchy.
    const content = await this.contentRepository.findOne({
      where: { id: contentId },
      relations: ['parent', 'parent.parent'],
    });

    if (!content) {
      this.logger.warn(`checkUserAccess failed: Content with ID ${contentId} not found.`);
      return null;
    }

    const idsToCheck: string[] = [content.id];
    if (content.parent) {
      idsToCheck.push(content.parent.id);
      if (content.parent.parent) {
        idsToCheck.push(content.parent.parent.id);
      }
    }

    // --- [NEW] OPTIMIZED PATH ---
    // If a pre-fetched set is provided, check against it without hitting the DB again.
    if (entitledContentIds) {
      for (const id of idsToCheck) {
        if (entitledContentIds.has(id)) {
          return true; // Access granted, we don't need the full entitlement object here.
        }
      }
      return null; // No access found in the pre-fetched set.
    }
    
    // --- ORIGINAL PATH (for single checks like in PurchaseService) ---
    const now = new Date();
    const entitlement = await this.entitlementRepository.findOne({
      where: [
        { userId, contentId: In(idsToCheck), accessType: AccessType.PERMANENT },
        { userId, contentId: In(idsToCheck), accessType: AccessType.TEMPORARY, validUntil: MoreThan(now) },
      ],
      order: {
        accessType: 'DESC',
        validUntil: 'DESC',
      },
    });

    return entitlement;
  }

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async handleExpiredEntitlements() {
    this.logger.log('Running daily job to process expired entitlements...');
    const now = new Date();

    const expiredEntitlements = await this.entitlementRepository.find({
      where: {
        accessType: AccessType.TEMPORARY,
        validUntil: LessThan(now),
      },
    });

    if (expiredEntitlements.length === 0) {
      this.logger.log('No expired entitlements found.');
      return;
    }

    this.logger.log(`Found ${expiredEntitlements.length} expired entitlements.`);

    for (const entitlement of expiredEntitlements) {
      this.logger.debug(`Entitlement ID ${entitlement.id} for User ${entitlement.userId} has expired.`);
    }

    this.logger.log('Finished processing expired entitlements.');
  }
}