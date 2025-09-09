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
    // --- THIS IS THE NEW, ROBUST LOGIC ---

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

    // Now the 'content' object is fully and safely constructed.
    // The rest of the logic remains the same.

    if (!content.isLocked) {
      return content;
    }

    const hasAccess = await this.checkUserAccess(contentId, userId);

    if (hasAccess) {
      return content;
    }

    return this.sanitizeContent(content);
  }

  private async checkUserAccess(contentId: string, userId: number): Promise<boolean> {
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
    const sanitizedContent = JSON.parse(JSON.stringify(content));

    if (
      sanitizedContent.type === ContentType.MOVIE ||
      sanitizedContent.type === ContentType.MUSIC_VIDEO
    ) {
      sanitizedContent.videoUrl = null;
    }
    
    if (sanitizedContent.children) {
      for (const season of sanitizedContent.children) {
        if (season.children) {
          for (const episode of season.children) {
            episode.videoUrl = null;
          }
        }
      }
    }

    return sanitizedContent;
  }
}