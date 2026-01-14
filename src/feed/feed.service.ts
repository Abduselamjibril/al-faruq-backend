// src/feed/feed.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like, In } from 'typeorm';
import { Content, ContentStatus, ContentType } from '../content/entities/content.entity';
import { FeedQueryDto } from './dto/feed-query.dto';
import { PaginationResponseDto } from '../utils/pagination.dto';
import { EntitlementService } from '../entitlement/entitlement.service';
import { UserContentEntitlement } from '../purchase/entities/user-content-entitlement.entity';
import { ContentPricing } from '../content/entities/content-pricing.entity';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectRepository(UserContentEntitlement)
    private readonly entitlementRepository: Repository<UserContentEntitlement>,
    @InjectRepository(ContentPricing)
    private readonly pricingRepository: Repository<ContentPricing>,
    private readonly entitlementService: EntitlementService,
  ) {}

  async getFeed(
    userId: string,
    query: FeedQueryDto,
  ): Promise<PaginationResponseDto<Content>> {
    const { page, limit, category, author, genre, year } = query;
    const take = limit || 10;
    const skip = ((page || 1) - 1) * take;

    const where: FindManyOptions<Content>['where'] = {};
    const topLevelTypes = [
      ContentType.MOVIE, ContentType.SERIES, ContentType.MUSIC_VIDEO,
      ContentType.DAWAH, ContentType.DOCUMENTARY, ContentType.PROPHET_HISTORY,
      ContentType.BOOK,
    ];
    
    // --- CRITICAL CHANGE: Only show PUBLISHED content ---
    where.status = ContentStatus.PUBLISHED;
    
    where.type = category ? category : In(topLevelTypes);

    if (where.type === ContentType.BOOK) {
      if (author) where.authorName = Like(`%${author}%`);
      if (genre) where.genre = Like(`%${genre}%`);
      if (year) where.publicationYear = year;
    }

    const [results, total] = await this.contentRepository.findAndCount({ where, order: { createdAt: 'DESC' }, take, skip });

    const userEntitlements = await this.entitlementRepository.find({ where: { userId } });
    const entitledContentIds = new Set(userEntitlements.map((e) => e.contentId));
    
    const lockedContentIds = results
      .filter((c) => c.isLocked && !entitledContentIds.has(c.id))
      .map((c) => c.id);

    let allPricingTiers: ContentPricing[] = [];
    if (lockedContentIds.length > 0) {
      allPricingTiers = await this.pricingRepository.find({
        where: { contentId: In(lockedContentIds), isActive: true },
      });
    }

    const pricingMap = new Map<string, ContentPricing[]>();
    allPricingTiers.forEach(tier => {
      const tiers = pricingMap.get(tier.contentId) || [];
      tiers.push(tier);
      pricingMap.set(tier.contentId, tiers);
    });

    results.forEach((content) => {
      if (content.isLocked) {
        if (entitledContentIds.has(content.id)) {
          content.isLocked = false;
        } else {
          content.videoUrl = null;
          content.audioUrl = null;
          content.pdfUrl = null;
          content.youtubeUrl = null;
          content.pricingTiers = pricingMap.get(content.id) || [];
        }
      }
    });

    const totalPages = Math.ceil(total / take);
    const meta = { totalItems: total, itemCount: results.length, itemsPerPage: take, totalPages, currentPage: page || 1 };

    return new PaginationResponseDto(results, meta);
  }

  async getMyPurchases(userId: string, query: FeedQueryDto): Promise<PaginationResponseDto<Content>> {
    const { page, limit, category, author, genre, year } = query;
    const take = limit || 10;
    const skip = ((page || 1) - 1) * take;

    const entitlements = await this.entitlementRepository.find({ where: { userId }, select: ['contentId'] });
    const entitledContentIds = entitlements.map((e) => e.contentId);

    if (entitledContentIds.length === 0) {
      return new PaginationResponseDto([], { totalItems: 0, itemCount: 0, itemsPerPage: take, totalPages: 0, currentPage: page || 1 });
    }

    const where: FindManyOptions<Content>['where'] = { id: In(entitledContentIds) };
    
    // --- CRITICAL CHANGE: Only show PUBLISHED content in the user's library ---
    where.status = ContentStatus.PUBLISHED;

    if (category) where.type = category;
    if (category === ContentType.BOOK) {
      if (author) where.authorName = Like(`%${author}%`);
      if (genre) where.genre = Like(`%${genre}%`);
      if (year) where.publicationYear = year;
    }

    const [results, total] = await this.contentRepository.findAndCount({ where, order: { createdAt: 'DESC' }, take, skip });

    const accessibleContent = results.map((content) => {
      content.isLocked = false;
      return content;
    });

    const totalPages = Math.ceil(total / take);
    return new PaginationResponseDto(accessibleContent, { totalItems: total, itemCount: accessibleContent.length, itemsPerPage: take, totalPages, currentPage: page || 1 });
  }

  async getContentForUser(contentId: string, userId: string): Promise<Content> {
    const qb = this.contentRepository.createQueryBuilder('content');
    qb.leftJoinAndSelect('content.children', 'seasonsOrEpisodes')
      .leftJoinAndSelect('seasonsOrEpisodes.children', 'episodes')
      .where('content.id = :id', { id: contentId })
      // --- CRITICAL CHANGE: Prevent access to non-published content by URL guessing ---
      .andWhere('content.status = :status', { status: ContentStatus.PUBLISHED })
      .orderBy({ 'seasonsOrEpisodes.createdAt': 'ASC', 'episodes.createdAt': 'ASC' });

    const content: Content | null = await qb.getOne();
    if (!content) {
      // This will now correctly throw a 404 for DRAFT, PENDING_REVIEW, or ARCHIVED content
      throw new NotFoundException(`Content with ID ${contentId} not found.`);
    }

    const userEntitlements = await this.entitlementRepository.find({ where: { userId } });
    const entitledContentIds = new Set(userEntitlements.map(e => e.contentId));
    
    const allIdsInHierarchy = this._getIdsFromHierarchy(content);
    const allPricing = await this.pricingRepository.find({
      where: { contentId: In(allIdsInHierarchy), isActive: true },
    });
    const pricingMap = new Map<string, ContentPricing[]>();
    allPricing.forEach(p => {
        const tiers = pricingMap.get(p.contentId) || [];
        tiers.push(p);
        pricingMap.set(p.contentId, tiers);
    });

    await this._processContentNode(content, entitledContentIds, pricingMap);

    return content;
  }

  private async _processContentNode(
    node: Content,
    entitledContentIds: Set<string>,
    pricingMap: Map<string, ContentPricing[]>
  ) {
    const hasAccess = await this.entitlementService.checkUserAccess(
      '',
      node.id,
      entitledContentIds,
    );
    
    if (node.isLocked) {
      if (hasAccess) {
        node.isLocked = false;
      } else {
        node.videoUrl = null;
        node.audioUrl = null;
        node.pdfUrl = null;
        node.youtubeUrl = null;
        node.pricingTiers = pricingMap.get(node.id) || [];
      }
    }
    
    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        await this._processContentNode(child, entitledContentIds, pricingMap);
      }
    }
  }
  
  private _getIdsFromHierarchy(root: Content): string[] {
      const ids: string[] = [root.id];
      if (root.children && root.children.length > 0) {
          for (const child of root.children) {
              ids.push(...this._getIdsFromHierarchy(child));
          }
      }
      return ids;
  }
}