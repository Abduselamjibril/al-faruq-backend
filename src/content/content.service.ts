// src/content/content.service.ts

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import {
  Content,
  ContentStatus,
  ContentType,
  ContentMediaType,
} from './entities/content.entity';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { Language } from './entities/language.entity';
import {
  ContentPricing,
  ContentPricingScope,
} from './entities/content-pricing.entity';
import { ContentType } from './entities/content.entity';
import { LockContentDto } from './dto/lock-content.dto';
import { AccessType } from '../common/enums/access-type.enum';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { PERMISSIONS } from '../database/seed.service';
import { RejectContentDto } from './dto/reject-content.dto';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectRepository(ContentPricing)
    private readonly pricingRepository: Repository<ContentPricing>,
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
    private readonly usersService: UsersService,
  ) {}

  async create(
    createContentDto: CreateContentDto,
    creatorId: string,
  ): Promise<Content> {
    const creator = await this.usersService.findById(creatorId);
    if (!creator) {
      throw new NotFoundException(`User with ID ${creatorId} not found.`);
    }

    // The DTO no longer has thumbnailUrl, it's now part of the main object.
    const { parentId, status, ...restDto } = createContentDto;
    if (parentId) {
      const parent = await this.contentRepository.findOneBy({ id: parentId });
      if (!parent) {
        throw new NotFoundException(
          `Parent content with ID ${parentId} not found.`,
        );
      }
    }
    const newContent = this.contentRepository.create({
      ...restDto, // 'media' array is now part of restDto
      parentId,
      createdBy: creator,
      status: status || ContentStatus.DRAFT, // Default to DRAFT if not provided
      submittedAt: status === ContentStatus.PENDING_REVIEW ? new Date() : null,
    });

    // --- [NEW] ---
    // Synchronize the legacy thumbnailUrl before saving.
    this.synchronizeThumbnailUrl(newContent);
    // --- [END NEW] ---

    return this.contentRepository.save(newContent);
  }

  findAllTopLevel(): Promise<Content[]> {
    return this.contentRepository.find({
      where: [
        { type: ContentType.MOVIE },
        { type: ContentType.SERIES },
        { type: ContentType.MUSIC_VIDEO },
        { type: ContentType.DAWAH },
        { type: ContentType.DOCUMENTARY },
        { type: ContentType.PROPHET_HISTORY },
        { type: ContentType.BOOK },
      ],
      relations: ['createdBy'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneWithHierarchy(id: string): Promise<Content> {
    const content = await this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.children', 'seasonsOrEpisodes')
      .leftJoinAndSelect('seasonsOrEpisodes.children', 'episodes')
      .leftJoinAndSelect('content.createdBy', 'creator') // Also fetch the creator's info
      .where('content.id = :id', { id })
      .orderBy({
        'seasonsOrEpisodes.createdAt': 'ASC',
        'episodes.createdAt': 'ASC',
      })
      .getOne();
    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found.`);
    }
    return content;
  }

  async update(
    id: string,
    updateContentDto: UpdateContentDto,
    user: any,
  ): Promise<Content> {
    const content = await this._findContentById(id);
    const canManageAll = user.permissions.includes(
      PERMISSIONS.CONTENT_MANAGE_ALL,
    );

    // If user is not an admin/moderator, check if they are the owner
    if (!canManageAll && content.createdBy?.id !== user.id) {
      throw new ForbiddenException(
        'You do not have permission to edit this content.',
      );
    }

    // Prevent uploader from editing content that is in review or published
    if (
      !canManageAll &&
      [ContentStatus.PENDING_REVIEW, ContentStatus.PUBLISHED].includes(
        content.status,
      )
    ) {
      throw new ForbiddenException(
        `You cannot edit content that is in '${content.status}' status.`,
      );
    }

    // Preload merges the existing entity with the new data from the DTO.
    const updatedContent = await this.contentRepository.preload({
      id: id,
      ...updateContentDto,
    });
    if (!updatedContent) {
      throw new NotFoundException(`Content with ID ${id} not found.`);
    }

    // --- [NEW] ---
    // Synchronize the legacy thumbnailUrl after the data has been merged, before saving.
    this.synchronizeThumbnailUrl(updatedContent);
    // --- [END NEW] ---

    return this.contentRepository.save(updatedContent);
  }

  async remove(id: string): Promise<{ message: string }> {
    const content = await this.contentRepository.findOneBy({ id });
    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found.`);
    }
    await this.contentRepository.remove(content);
    return { message: 'Content successfully deleted.' };
  }

  // --- Workflow Methods ---

  async submitForReview(id: string, user: any): Promise<Content> {
    const content = await this._findContentById(id);
    if (content.createdBy?.id !== user.id) {
      throw new ForbiddenException(
        'You can only submit your own content for review.',
      );
    }
    if (content.status !== ContentStatus.DRAFT) {
      throw new BadRequestException(
        `Content must be in DRAFT status to be submitted for review. Current status: ${content.status}`,
      );
    }
    content.status = ContentStatus.PENDING_REVIEW;
    content.submittedAt = new Date();
    content.rejectionReason = null; // Clear any previous rejection reason
    return this.contentRepository.save(content);
  }

  async approveContent(id: string): Promise<Content> {
    const content = await this._findContentById(id);
    if (content.status !== ContentStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Content must be in PENDING_REVIEW status to be approved. Current status: ${content.status}`,
      );
    }
    content.status = ContentStatus.PUBLISHED;
    return this.contentRepository.save(content);
  }

  async rejectContent(
    id: string,
    rejectDto: RejectContentDto,
  ): Promise<Content> {
    const content = await this._findContentById(id);
    if (content.status !== ContentStatus.PENDING_REVIEW) {
      throw new BadRequestException(
        `Content must be in PENDING_REVIEW status to be rejected. Current status: ${content.status}`,
      );
    }
    content.status = ContentStatus.DRAFT;
    content.rejectionReason = rejectDto.rejectionReason;
    return this.contentRepository.save(content);
  }

  async archiveContent(id: string): Promise<Content> {
    const content = await this._findContentById(id);
    if (content.status !== ContentStatus.PUBLISHED) {
      throw new BadRequestException(
        `Only PUBLISHED content can be archived. Current status: ${content.status}`,
      );
    }
    content.status = ContentStatus.ARCHIVED;
    return this.contentRepository.save(content);
  }

  async restoreContent(id: string): Promise<Content> {
    const content = await this._findContentById(id);
    if (content.status !== ContentStatus.ARCHIVED) {
      throw new BadRequestException(
        `Only ARCHIVED content can be restored. Current status: ${content.status}`,
      );
    }
    content.status = ContentStatus.PUBLISHED;
    return this.contentRepository.save(content);
  }

  // --- Pricing ---

  async lockContent(
    contentId: string,
    lockContentDto: LockContentDto,
  ): Promise<Content> {
    const content = await this.contentRepository.findOneBy({ id: contentId });
    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found.`);
    }
    const { permanentPrice, temporaryPrice } = lockContentDto;
    if (!permanentPrice && !temporaryPrice) {
      throw new BadRequestException(
        'You must provide at least one pricing option (permanent or temporary).',
      );
    }
    await this.pricingRepository.update({ contentId }, { isActive: false });
    // Upsert permanent price
    if (permanentPrice) {
      let permPricing = await this.pricingRepository.findOne({
        where: { contentId, accessType: AccessType.PERMANENT },
      });
      if (permPricing) {
        permPricing.basePrice = permanentPrice.price;
        permPricing.isVatAdded = permanentPrice.isVatAdded ?? false;
        permPricing.durationDays = null;
        permPricing.isActive = true;
        await this.pricingRepository.save(permPricing);
      } else {
        await this.pricingRepository.save({
          contentId,
          contentType: this._toPricingScope(content.type),
          accessType: AccessType.PERMANENT,
          basePrice: permanentPrice.price,
          isVatAdded: permanentPrice.isVatAdded,
          durationDays: null,
          isActive: true,
        });
      }
    }
    // Upsert temporary price
    if (temporaryPrice) {
      let tempPricing = await this.pricingRepository.findOne({
        where: { contentId, accessType: AccessType.TEMPORARY },
      });
      if (tempPricing) {
        tempPricing.basePrice = temporaryPrice.price;
        tempPricing.isVatAdded = temporaryPrice.isVatAdded ?? false;
        tempPricing.durationDays = temporaryPrice.durationDays;
        tempPricing.isActive = true;
        await this.pricingRepository.save(tempPricing);
      } else {
        await this.pricingRepository.save({
          contentId,
          contentType: this._toPricingScope(content.type),
          accessType: AccessType.TEMPORARY,
          basePrice: temporaryPrice.price,
          isVatAdded: temporaryPrice.isVatAdded,
          durationDays: temporaryPrice.durationDays,
          isActive: true,
        });
      }
    }
    content.isLocked = true;
    const savedContent = await this.contentRepository.save(content);
    savedContent.videoUrl = null;
    savedContent.audioUrl = null;
    savedContent.pdfUrl = null;
    savedContent.youtubeUrl = null;
    return savedContent;
  }

  private _toPricingScope(type: ContentType): ContentPricingScope {
    switch (type) {
      case ContentType.SERIES:
        return ContentPricingScope.SERIES;
      case ContentType.SEASON:
        return ContentPricingScope.SEASON;
      case ContentType.EPISODE:
      case ContentType.PROPHET_HISTORY_EPISODE:
        return ContentPricingScope.EPISODE;
      case ContentType.BOOK:
        return ContentPricingScope.BOOK;
      // Treat single-video-like types as MOVIE for pricing scope
      case ContentType.MOVIE:
      case ContentType.MUSIC_VIDEO:
      case ContentType.DAWAH:
      case ContentType.DOCUMENTARY:
      case ContentType.PROPHET_HISTORY:
      default:
        return ContentPricingScope.MOVIE;
    }
  }

  async unlockContent(id: string): Promise<Content> {
    const content = await this.contentRepository.findOneBy({ id });
    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found.`);
    }
    await this.pricingRepository.update({ contentId: id }, { isActive: false });
    content.isLocked = false;
    return this.contentRepository.save(content);
  }

  // --- Search ---

  async searchTopLevelContent(
    query: string,
    type?: ContentType,
  ): Promise<Content[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    const qb = this.contentRepository.createQueryBuilder('content');
    if (type) {
      qb.where('content.type = :type', { type });
    } else {
      qb.where('content.type IN (:...types)', {
        types: [
          ContentType.MOVIE,
          ContentType.SERIES,
          ContentType.MUSIC_VIDEO,
          ContentType.DAWAH,
          ContentType.DOCUMENTARY,
          ContentType.PROPHET_HISTORY,
          ContentType.BOOK,
        ],
      });
    }
    qb.andWhere(
      new Brackets((subQb) => {
        subQb
          .where('LOWER(content.title) LIKE :searchTerm', { searchTerm })
          .orWhere('LOWER(content.description) LIKE :searchTerm', {
            searchTerm,
          })
          .orWhere('LOWER(content.tags) LIKE :searchTerm', { searchTerm })
          .orWhere('LOWER(content.authorName) LIKE :searchTerm', {
            searchTerm,
          })
          .orWhere('LOWER(content.genre) LIKE :searchTerm', { searchTerm });
      }),
    )
      .orderBy('content.createdAt', 'DESC')
      .take(20);
    return qb.getMany();
  }

  async searchEpisodes(query: string): Promise<Content[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    return this.contentRepository
      .createQueryBuilder('episode')
      .leftJoinAndSelect('episode.parent', 'parentContent')
      .where('episode.type IN (:...types)', {
        types: [ContentType.EPISODE, ContentType.PROPHET_HISTORY_EPISODE],
      })
      .andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(episode.title) LIKE :searchTerm', { searchTerm }).orWhere(
            'LOWER(parentContent.title) LIKE :searchTerm',
            { searchTerm },
          );
        }),
      )
      .orderBy('parentContent.title', 'ASC')
      .addOrderBy('episode.createdAt', 'ASC')
      .take(20)
      .getMany();
  }

  // --- Private Helper Methods ---

  private async _findContentById(id: string): Promise<Content> {
    const content = await this.contentRepository.findOne({
      where: { id },
      relations: ['createdBy'], // Eager load the creator for authorization checks
    });
    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found.`);
    }
    return content;
  }

  // --- [NEW] ---
  /**
   * A helper method to ensure the legacy `thumbnailUrl` field is always
   * in sync with the `media` array's primary thumbnail.
   * This method directly mutates the content object passed to it.
   * @param content The content entity to synchronize.
   */
  private synchronizeThumbnailUrl(content: Content): void {
    if (content.media && content.media.length > 0) {
      // Find the first media item that is a thumbnail and is marked as primary.
      const primaryThumbnail = content.media.find(
        (item) => item.type === ContentMediaType.THUMBNAIL && item.isPrimary,
      );
      // If a primary thumbnail is found, set its URL. Otherwise, set to null.
      content.thumbnailUrl = primaryThumbnail ? primaryThumbnail.url : null;
    } else {
      // If the media array is empty or null, ensure the legacy field is also null.
      content.thumbnailUrl = null;
    }
  }
  // --- [END NEW] ---
}