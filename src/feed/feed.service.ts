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

  async getAllTafsir(): Promise<Content[]> {
    return this.contentRepository.find({
      where: {
        type: ContentType.QURAN_TAFSIR,
      },
      order: {
        createdAt: 'ASC', // Or order by title, etc.
      },
      select: ['id', 'title', 'description', 'thumbnailUrl', 'createdAt'], // Select only needed fields for list view
    });
  }

  // --- [NEW] METHOD TO GET USER'S ACTIVE PURCHASES ---
  async getMyPurchases(userId: number): Promise<Content[]> {
    const now = new Date();

    // Find all active purchases for the user and join the related content
    const userPurchases = await this.purchaseRepository.find({
      where: {
        user: { id: userId },
        expiresAt: MoreThan(now),
      },
      relations: ['content'], // Eagerly load the content for each purchase
      order: {
        createdAt: 'DESC', // Show the most recent purchases first
      },
    });

    // Extract the content from the purchases and prepare it for the response
    const purchasedContent = userPurchases.map((purchase) => {
      const content = purchase.content;
      // For this response, the content is always considered unlocked
      content.isLocked = false;
      // We don't need to show the user pricing info for content they already own
      content.pricingTier = null;
      return content;
    });

    return purchasedContent;
  }
  // --- [END OF NEW] ---

  async getContentForUser(contentId: string, userId: number): Promise<Content> {
    const content = await this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.pricingTier', 'pricingTier')
      .leftJoinAndSelect('content.audioTracks', 'audioTracks')
      .leftJoinAndSelect('audioTracks.language', 'language')
      .where('content.id = :id', { id: contentId })
      .orderBy('audioTracks.createdAt', 'ASC')
      .getOne();

    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found.`);
    }

    if (content.type === ContentType.QURAN_TAFSIR) {
      content.isLocked = false;
      content.pricingTier = null;
      return content;
    }

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

    if (!content.isLocked) {
      return content;
    }

    const hasAccess = await this.checkUserAccess(contentId, userId);

    if (hasAccess) {
      content.isLocked = false;
      content.pricingTier = null;
    } else {
      if (
        content.type === ContentType.MOVIE ||
        content.type === ContentType.MUSIC_VIDEO
      ) {
        content.videoUrl = null;
      }
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