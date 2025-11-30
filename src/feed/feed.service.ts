// src/feed/feed.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, FindManyOptions, Like, In } from 'typeorm'; // --- [FIX] IMPORT 'In' ---
import { Content, ContentType } from '../content/entities/content.entity';
import { Purchase } from '../purchase/entities/purchase.entity';
import { FeedQueryDto } from './dto/feed-query.dto';
import { PaginationResponseDto } from '../utils/pagination.dto';

@Injectable()
export class FeedService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectRepository(Purchase)
    private readonly purchaseRepository: Repository<Purchase>,
  ) {}

  async getFeed(
    userId: number,
    query: FeedQueryDto,
  ): Promise<PaginationResponseDto<Content>> {
    const { page, limit, category, author, genre, year } = query;
    const take = limit || 10;
    const skip = ((page || 1) - 1) * take;

    // --- Step A: Build dynamic query options ---
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

    // Filter by category if provided, otherwise default to all top-level types
    where.type = category ? category : In(topLevelTypes);

    // Add book-specific filters only if the category is BOOK
    if (where.type === ContentType.BOOK) {
      if (author) where.authorName = Like(`%${author}%`);
      if (genre) where.genre = Like(`%${genre}%`);
      if (year) where.publicationYear = year;
    }

    // --- Step B: Fetch paginated data and total count ---
    const [results, total] = await this.contentRepository.findAndCount({
      where,
      relations: ['pricingTier'],
      order: { createdAt: 'DESC' },
      take,
      skip,
    });

    // --- Step C: Personalize the results for the user ---
    const now = new Date();
    const userPurchases = await this.purchaseRepository.find({
      where: { user: { id: userId }, expiresAt: MoreThan(now) },
      relations: ['content'],
    });
    const purchasedContentIds = new Set(userPurchases.map((p) => p.content.id));

    results.forEach((content) => {
      if (content.isLocked && !purchasedContentIds.has(content.id)) {
        content.videoUrl = null;
        content.audioUrl = null;
        content.pdfUrl = null;
      } else if (content.isLocked && purchasedContentIds.has(content.id)) {
        content.isLocked = false;
        content.pricingTier = null;
      }
    });

    // --- Step D: Format and return the paginated response ---
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

  async getMyPurchases(
    userId: number,
    query: FeedQueryDto,
  ): Promise<PaginationResponseDto<Content>> {
    const { page, limit, category, author, genre, year } = query;
    const take = limit || 10;
    const skip = ((page || 1) - 1) * take;

    // --- Step A: Build dynamic where clause for purchases ---
    const contentFilters: FindManyOptions<Content>['where'] = {};
    if (category) contentFilters.type = category;
    if (category === ContentType.BOOK) {
      if (author) contentFilters.authorName = Like(`%${author}%`);
      if (genre) contentFilters.genre = Like(`%${genre}%`);
      if (year) contentFilters.publicationYear = year;
    }

    const where: FindManyOptions<Purchase>['where'] = {
      user: { id: userId },
      expiresAt: MoreThan(new Date()),
      content:
        Object.keys(contentFilters).length > 0 ? contentFilters : undefined,
    };

    // --- Step B: Fetch paginated purchases and total count ---
    const [purchases, total] = await this.purchaseRepository.findAndCount({
      where,
      relations: ['content'],
      order: { createdAt: 'DESC' },
      take,
      skip,
    });

    // --- Step C: Prepare the content for the response ---
    const purchasedContent = purchases.map((purchase) => {
      const content = purchase.content;
      content.isLocked = false;
      content.pricingTier = null;
      return content;
    });

    // --- Step D: Format and return the paginated response ---
    const totalPages = Math.ceil(total / take);
    const meta = {
      totalItems: total,
      itemCount: purchasedContent.length,
      itemsPerPage: take,
      totalPages,
      currentPage: page || 1,
    };

    return new PaginationResponseDto(purchasedContent, meta);
  }

  async getAllTafsir(): Promise<Content[]> {
    return this.contentRepository.find({
      where: {
        type: ContentType.QURAN_TAFSIR,
      },
      order: {
        createdAt: 'ASC',
      },
      select: ['id', 'title', 'description', 'thumbnailUrl', 'createdAt'],
    });
  }

  async getContentForUser(
    contentId: string,
    userId: number,
  ): Promise<Content> {
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

    if (
      content.type === ContentType.SERIES ||
      content.type === ContentType.PROPHET_HISTORY
    ) {
      content.children = await this.contentRepository.find({
        where: { parentId: content.id },
        order: { createdAt: 'ASC' },
      });
    }

    if (!content.isLocked) {
      return content;
    }

    const hasAccess = await this.checkUserAccess(contentId, userId);

    if (hasAccess) {
      content.isLocked = false;
      content.pricingTier = null;
    } else {
      content.videoUrl = null;
      content.audioUrl = null;
      content.pdfUrl = null;
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