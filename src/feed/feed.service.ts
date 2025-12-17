// src/feed/feed.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan, FindManyOptions, Like, In } from 'typeorm';
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

    const [results, total] = await this.contentRepository.findAndCount({
      where,
      relations: ['pricingTier'],
      order: { createdAt: 'DESC' },
      take,
      skip,
    });

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
        content.youtubeUrl = null;
      } else if (content.isLocked && purchasedContentIds.has(content.id)) {
        content.isLocked = false;
        content.pricingTier = null;
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

  async getMyPurchases(
    userId: number,
    query: FeedQueryDto,
  ): Promise<PaginationResponseDto<Content>> {
    const { page, limit, category, author, genre, year } = query;
    const take = limit || 10;
    const skip = ((page || 1) - 1) * take;

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

    const [purchases, total] = await this.purchaseRepository.findAndCount({
      where,
      relations: ['content'],
      order: { createdAt: 'DESC' },
      take,
      skip,
    });

    const purchasedContent = purchases.map((purchase) => {
      const content = purchase.content;
      content.isLocked = false;
      content.pricingTier = null;
      return content;
    });

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

  // --- [REMOVED] The 'getAllTafsir' method is deleted. ---

  async getContentForUser(
    contentId: string,
    userId: number,
  ): Promise<Content> {
    // Deep join: content -> children (seasons) -> children (episodes)

    let content: Content | undefined;
    const found = await this.contentRepository.findOne({ where: { id: contentId } });
    if (!found) {
      throw new NotFoundException(`Content with ID ${contentId} not found.`);
    }
    if (found.type === ContentType.SERIES || found.type === ContentType.PROPHET_HISTORY) {
      content = await this.contentRepository
        .createQueryBuilder('content')
        .leftJoinAndSelect('content.children', 'seasonsOrEpisodes')
        .leftJoinAndSelect('seasonsOrEpisodes.children', 'episodes')
        .leftJoinAndSelect('content.pricingTier', 'pricingTier')
        .where('content.id = :id', { id: contentId })
        .orderBy({
          'seasonsOrEpisodes.createdAt': 'ASC',
          'episodes.createdAt': 'ASC',
        })
        .getOne() || undefined;
    } else {
      content = await this.contentRepository
        .createQueryBuilder('content')
        .leftJoinAndSelect('content.pricingTier', 'pricingTier')
        .where('content.id = :id', { id: contentId })
        .getOne() || undefined;
    }
    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found.`);
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
      content.youtubeUrl = null;
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