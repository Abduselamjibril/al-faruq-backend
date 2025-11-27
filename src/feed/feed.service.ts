// src/feed/feed.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Content, ContentType } from '../content/entities/content.entity';
import { Purchase } from '../purchase/entities/purchase.entity';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
  ) {}

  async getFeed(userId: number): Promise<Content[]> {
    // Step A: Get a set of all content IDs the user has active purchases for.
    const now = new Date();
    const userPurchases = await this.purchaseRepository.find({
      where: {
        user: { id: userId },
        expiresAt: MoreThan(now),
      },
      relations: ['content'],
    });
    const purchasedContentIds = new Set(
      userPurchases.map((p) => p.content.id),
    );

    // Step B: Get all top-level content items from the database.
    const allTopLevelContent = await this.contentRepository.find({
      where: [
        { type: ContentType.MOVIE },
        { type: ContentType.SERIES },
        { type: ContentType.MUSIC_VIDEO },
      ],
      relations: ['pricingTier'],
      order: { createdAt: 'DESC' },
    });

    // Step C: Iterate over the content and personalize it for the user by mutating it.
    // We use forEach to modify the array's items in place.
    allTopLevelContent.forEach((content) => {
      // If the content is globally locked, we need to check user's access.
      if (content.isLocked) {
        // Check if the user's purchased IDs include this content's ID.
        if (purchasedContentIds.has(content.id)) {
          // User has access. Mutate the object for this response.
          content.isLocked = false; // Override the lock status for this response.
          content.pricingTier = null; // User doesn't need pricing info anymore.
        } else {
          // User does not have access. Sanitize the locked content.
          content.videoUrl = null; // IMPORTANT: Nullify the video URL.
        }
      }
    });

    // Return the original array, which now contains the modified Content instances.
    return allTopLevelContent;
  }

  async getContentForUser(contentId: string, userId: number): Promise<Content> {
    // Step 1: Fetch the main content item first.
    const content = await this.contentRepository.findOne({
      where: { id: contentId },
      relations: ['pricingTier'],
    });

    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found.`);
    }

    // Step 2: If it's a SERIES, manually fetch its children (seasons and episodes).
    if (content.type === ContentType.SERIES) {
      const seasons = await this.contentRepository.find({
        where: { parentId: content.id },
        order: { createdAt: 'ASC' },
      });

      for (const season of seasons) {
        season.children = await this.contentRepository.find({
          where: { parentId: season.id },
          order: { createdAt: 'ASC' },
        });
      }
      content.children = seasons;
    }

    // If the content is not locked globally, return it as is.
    if (!content.isLocked) {
      return content;
    }

    // If the content IS locked, check if this specific user has access.
    const hasAccess = await this.checkUserAccess(contentId, userId);

    // If the user has access, mutate the content object for the response.
    if (hasAccess) {
      content.isLocked = false;
      content.pricingTier = null;
    } else {
      // If the user does NOT have access, sanitize the content in place.
      if (
        content.type === ContentType.MOVIE ||
        content.type === ContentType.MUSIC_VIDEO
      ) {
        content.videoUrl = null;
      }
      // For series, loop through and nullify all episode video URLs.
      if (content.children) {
        for (const season of content.children) {
          if (season.children) {
            for (const episode of season.children) {
              episode.videoUrl = null;
            }
          }
        }
      }
    }

    return content;
  }

  private async checkUserAccess(
    contentId: string,
    userId: number,
  ): Promise<boolean> {
    const now = new Date();
    const purchase = await this.purchaseRepository.findOne({
      where: {
        user: { id: userId },
        content: { id: contentId },
        expiresAt: MoreThan(now),
      },
    });

    return !!purchase;
  }
}