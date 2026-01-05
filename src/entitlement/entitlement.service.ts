// src/entitlement/entitlement.service.ts

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository, IsNull } from 'typeorm'; // --- [FIX] IMPORT IsNull ---
import { UserContentEntitlement } from '../purchase/entities/user-content-entitlement.entity';

@Injectable()
export class EntitlementService {
  constructor(
    @InjectRepository(UserContentEntitlement)
    private readonly entitlementRepository: Repository<UserContentEntitlement>,
  ) {}

  /**
   * Checks if a user has a valid entitlement for a specific piece of content.
   * This is the new source of truth for access control.
   * @param userId The ID of the user.
   * @param contentId The ID of the content (e.g., an episode).
   * @returns The valid entitlement record if access is granted, otherwise null.
   */
  async checkUserAccess(
    userId: number,
    contentId: string,
  ): Promise<UserContentEntitlement | null> {
    const now = new Date();

    // Find the entitlement for this specific user and content.
    // The query checks for two conditions:
    // 1. The entitlement is PERMANENT (validUntil is NULL).
    // 2. The entitlement is TEMPORARY and has not expired yet (validUntil > now).
    const entitlement = await this.entitlementRepository.findOne({
      where: [
        // --- [FIX] Use the IsNull() operator instead of the 'null' literal ---
        { userId, contentId, validUntil: IsNull() }, // Permanent access
        { userId, contentId, validUntil: MoreThan(now) }, // Temporary, non-expired access
      ],
    });

    return entitlement; // Returns the entitlement object or null
  }
}