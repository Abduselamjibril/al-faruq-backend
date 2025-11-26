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

  async getFeed(): Promise<Content[]> {
    return this.contentRepository.find({
      where: [
        { type: ContentType.MOVIE },
        { type: ContentType.SERIES },
        { type: ContentType.MUSIC_VIDEO },
      ],
      relations: ['pricingTier'],
      order: { createdAt: 'DESC' },
    });
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

    // Step 2: If it's a SERIES, manually fetch its children (seasons).
    if (content.type === ContentType.SERIES) {
      const seasons = await this.contentRepository.find({
        where: { parentId: content.id },
        order: { createdAt: 'ASC' },
      });

      // Step 3: For each season, manually fetch its children (episodes).
      for (const season of seasons) {
        season.children = await this.contentRepository.find({
          where: { parentId: season.id },
          order: { createdAt: 'ASC' },
        });
      }
      content.children = seasons;
    }

    // --- [CHANGE 1 START] ---
    // This is the new, improved logic for handling user-specific access.

    // If the content is not locked globally, return it as is.
    if (!content.isLocked) {
      return content;
    }

    // If the content IS locked, check if this specific user has access.
    const hasAccess = await this.checkUserAccess(contentId, userId);

    // If the user has access, create a modified copy for the response.
    if (hasAccess) {
      // We create a deep copy to avoid modifying the original object in memory.
      const unlockedContentForUser = JSON.parse(JSON.stringify(content));

      // Explicitly set isLocked to false for this user's response.
      // The videoUrl is already present, so the user gets full access.
      unlockedContentForUser.isLocked = false;
      
      // The pricingTier is not needed if the content is presented as unlocked.
      // This makes the response cleaner for the frontend developer.
      unlockedContentForUser.pricingTier = null;

      return unlockedContentForUser;
    }

    // If the user does NOT have access, sanitize the content.
    // The original `sanitizeContent` method already keeps `isLocked: true`
    // and sets the video URLs to null, which is what we want.
    return this.sanitizeContent(content);
    // --- [CHANGE 1 END] ---
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

  private sanitizeContent(content: Content): Content {
    // We create a deep copy to ensure we don't accidentally modify the original object.
    const sanitizedContent = JSON.parse(JSON.stringify(content));

    // For single video content types, nullify the main video URL.
    if (
      sanitizedContent.type === ContentType.MOVIE ||
      sanitizedContent.type === ContentType.MUSIC_VIDEO
    ) {
      sanitizedContent.videoUrl = null;
    }

    // For series, loop through and nullify all episode video URLs.
    if (sanitizedContent.children) {
      for (const season of sanitizedContent.children) {
        if (season.children) {
          for (const episode of season.children) {
            episode.videoUrl = null;
          }
        }
      }
    }

    // The isLocked status is already `true` from the database, so we don't need to change it.
    return sanitizedContent;
  }
}