// src/feed/feed.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like, In } from 'typeorm';
import { Content, ContentType } from '../content/entities/content.entity';
import { FeedQueryDto } from './dto/feed-query.dto';
import { PaginationResponseDto } from '../utils/pagination.dto';
import { EntitlementService } from '../entitlement/entitlement.service';
import { UserContentEntitlement } from '../purchase/entities/user-content-entitlement.entity';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectRepository(UserContentEntitlement)
    private readonly entitlementRepository: Repository<UserContentEntitlement>,
    private readonly entitlementService: EntitlementService, // --- [NEW] INJECT THE ENTITLEMENT SERVICE ---
  ) {}

  async getFeed(
    userId: number,
    query: FeedQueryDto,
  ): Promise<PaginationResponseDto<Content>> {
    const { page, limit, category, author, genre, year } = query;
    const take = limit || 10;
    const skip = ((page || 1) - 1) * take;

    const where: FindManyOptions<Content>['where'] = {};
    const topLevelTypes = [
      ContentType.MOVIE,
      ContentType.SERIES,
      ContentType.MUSIC_VIDEO,
      ContentType.DAWAH,
      ContentType.DOCUMENTARY,
      ContentType.PROPHET_HISTORY,
      ContentType.BOOK,
    ];

    where.type = category ? category : In(topLevelTypes);

    if (where.type === ContentType.BOOK) {
      if (author) where.authorName = Like(`%${author}%`);
      if (genre) where.genre = Like(`%${genre}%`);
      if (year) where.publicationYear = year;
    }

    // --- [REMOVED] 'pricingTier' is no longer a relation
    const [results, total] = await this.contentRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take,
      skip,
    });

    // --- [CHANGED] Fetch all valid entitlements for the user ---
    const userEntitlements = await this.entitlementRepository.find({
      where: { userId },
    });
    const entitledContentIds = new Set(
      userEntitlements.map((e) => e.contentId),
    );

    // --- [CHANGED] Logic now checks for entitlements, not purchases ---
    results.forEach((content) => {
      if (content.isLocked && !entitledContentIds.has(content.id)) {
        content.videoUrl = null;
        content.audioUrl = null;
        content.pdfUrl = null;
        content.youtubeUrl = null;
      } else if (content.isLocked && entitledContentIds.has(content.id)) {
        content.isLocked = false;
      }
    });

    const totalPages = Math.ceil(total / take);
    const meta = {
      totalItems: total,
      itemCount: results.length,
      itemsPerPage: take,
      totalPages,
      currentPage: page || 1,
    };

    return new PaginationResponseDto(results, meta);
  }

  // --- [RENAMED & REFACTORED] from getMyPurchases to getMyContent ---
  async getMyContent(
    userId: number,
    query: FeedQueryDto,
  ): Promise<PaginationResponseDto<Content>> {
    const { page, limit, category, author, genre, year } = query;
    const take = limit || 10;
    const skip = ((page || 1) - 1) * take;

    // First, find all content IDs the user is entitled to
    const entitlements = await this.entitlementRepository.find({
      where: { userId },
      select: ['contentId'],
    });
    const entitledContentIds = entitlements.map((e) => e.contentId);

    if (entitledContentIds.length === 0) {
      const meta = {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: take,
        totalPages: 0,
        currentPage: page || 1,
      };
      return new PaginationResponseDto([], meta);
    }

    // Now, find the content that matches those IDs and the filters
    const where: FindManyOptions<Content>['where'] = {
      id: In(entitledContentIds),
    };

    if (category) where.type = category;
    if (category === ContentType.BOOK) {
      if (author) where.authorName = Like(`%${author}%`);
      if (genre) where.genre = Like(`%${genre}%`);
      if (year) where.publicationYear = year;
    }

    const [results, total] = await this.contentRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      take,
      skip,
    });

    // All content returned here is accessible, so unlock it
    const accessibleContent = results.map((content) => {
      content.isLocked = false;
      return content;
    });

    const totalPages = Math.ceil(total / take);
    const meta = {
      totalItems: total,
      itemCount: accessibleContent.length,
      itemsPerPage: take,
      totalPages,
      currentPage: page || 1,
    };

    return new PaginationResponseDto(accessibleContent, meta);
  }

  async getContentForUser(
    contentId: string,
    userId: number,
  ): Promise<Content> {
    let content: Content | null = null;
    const found = await this.contentRepository.findOne({
      where: { id: contentId },
    });
    if (!found) {
      throw new NotFoundException(`Content with ID ${contentId} not found.`);
    }

    // Simplified query builder, no longer needs pricingTier
    const qb = this.contentRepository.createQueryBuilder('content');
    if (
      found.type === ContentType.SERIES ||
      found.type === ContentType.PROPHET_HISTORY
    ) {
      qb.leftJoinAndSelect('content.children', 'seasonsOrEpisodes').leftJoinAndSelect(
        'seasonsOrEpisodes.children',
        'episodes',
      );
    }
    qb.where('content.id = :id', { id: contentId }).orderBy({
      'seasonsOrEpisodes.createdAt': 'ASC',
      'episodes.createdAt': 'ASC',
    });

    content = await qb.getOne();

    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found.`);
    }

    if (!content.isLocked) {
      return content;
    }

    // --- [CHANGED] Use EntitlementService for the access check ---
    const hasAccess = await this.entitlementService.checkUserAccess(
      userId,
      contentId,
    );

    if (hasAccess) {
      content.isLocked = false;
    } else {
      // If no access, redact sensitive URLs
      content.videoUrl = null;
      content.audioUrl = null;
      content.pdfUrl = null;
      content.youtubeUrl = null;
    }

    return content;
  }
}