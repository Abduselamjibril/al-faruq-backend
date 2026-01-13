// src/content/content.service.ts

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { Content, ContentType } from './entities/content.entity';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { Language } from './entities/language.entity';
import {
  ContentPricing,
  ContentPricingScope,
} from './entities/content-pricing.entity';
import { LockContentDto } from './dto/lock-content.dto';
import { AccessType } from '../common/enums/access-type.enum';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectRepository(ContentPricing)
    private readonly pricingRepository: Repository<ContentPricing>,
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
  ) {}

  async create(createContentDto: CreateContentDto): Promise<Content> {
    const { parentId } = createContentDto;
    if (parentId) {
      const parent = await this.contentRepository.findOneBy({ id: parentId });
      if (!parent) {
        throw new NotFoundException(`Parent content with ID ${parentId} not found.`);
      }
    }
    const newContent = this.contentRepository.create(createContentDto);
    return this.contentRepository.save(newContent);
  }

  findAllTopLevel(): Promise<Content[]> {
    return this.contentRepository.find({
      where: [
        { type: ContentType.MOVIE }, { type: ContentType.SERIES },
        { type: ContentType.MUSIC_VIDEO }, { type: ContentType.DAWAH },
        { type: ContentType.DOCUMENTARY }, { type: ContentType.PROPHET_HISTORY },
        { type: ContentType.BOOK },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneWithHierarchy(id: string): Promise<Content> {
    const content = await this.contentRepository.createQueryBuilder('content')
      .leftJoinAndSelect('content.children', 'seasonsOrEpisodes')
      .leftJoinAndSelect('seasonsOrEpisodes.children', 'episodes')
      .where('content.id = :id', { id })
      .orderBy({ 'seasonsOrEpisodes.createdAt': 'ASC', 'episodes.createdAt': 'ASC' })
      .getOne();
    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found.`);
    }
    return content;
  }

  async update(id: string, updateContentDto: UpdateContentDto): Promise<Content> {
    const content = await this.contentRepository.preload({ id: id, ...updateContentDto });
    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found.`);
    }
    return this.contentRepository.save(content);
  }

  async remove(id: string): Promise<{ message: string }> {
    const content = await this.contentRepository.findOneBy({ id });
    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found.`);
    }
    await this.contentRepository.remove(content);
    return { message: 'Content successfully deleted.' };
  }

  async lockContent(contentId: string, lockContentDto: LockContentDto): Promise<Content> {
    const content = await this.contentRepository.findOneBy({ id: contentId });
    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found.`);
    }

    const { permanentPrice, temporaryPrice } = lockContentDto;
    if (!permanentPrice && !temporaryPrice) {
      throw new BadRequestException('You must provide at least one pricing option (permanent or temporary).');
    }

    await this.pricingRepository.update({ contentId }, { isActive: false });

    if (permanentPrice !== undefined) {
      await this.pricingRepository.save({
        contentId,
        contentType: content.type as unknown as ContentPricingScope,
        accessType: AccessType.PERMANENT,
        price: permanentPrice,
        durationDays: null,
        isActive: true,
      });
    }

    if (temporaryPrice) {
      await this.pricingRepository.save({
        contentId,
        contentType: content.type as unknown as ContentPricingScope,
        accessType: AccessType.TEMPORARY,
        price: temporaryPrice.price,
        durationDays: temporaryPrice.durationDays,
        isActive: true,
      });
    }

    content.isLocked = true;
    const savedContent = await this.contentRepository.save(content);

    // --- [FIX] Explicitly nullify sensitive URLs before returning the response ---
    savedContent.videoUrl = null;
    savedContent.audioUrl = null;
    savedContent.pdfUrl = null;
    savedContent.youtubeUrl = null;

    return savedContent;
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
  
  async searchTopLevelContent(query: string, type?: ContentType): Promise<Content[]> {
    const searchTerm = `%${query.toLowerCase()}%`;
    const qb = this.contentRepository.createQueryBuilder('content');

    if (type) {
      qb.where('content.type = :type', { type });
    } else {
      qb.where('content.type IN (:...types)', {
        types: [
          ContentType.MOVIE, ContentType.SERIES, ContentType.MUSIC_VIDEO,
          ContentType.DAWAH, ContentType.DOCUMENTARY, ContentType.PROPHET_HISTORY,
          ContentType.BOOK,
        ],
      });
    }

    qb.andWhere(
      new Brackets((subQb) => {
        subQb
          .where('LOWER(content.title) LIKE :searchTerm', { searchTerm })
          .orWhere('LOWER(content.description) LIKE :searchTerm', { searchTerm })
          .orWhere('LOWER(content.tags) LIKE :searchTerm', { searchTerm })
          .orWhere('LOWER(content.authorName) LIKE :searchTerm', { searchTerm })
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
          qb.where('LOWER(episode.title) LIKE :searchTerm', { searchTerm })
            .orWhere('LOWER(parentContent.title) LIKE :searchTerm', { searchTerm });
        }),
      )
      .orderBy('parentContent.title', 'ASC')
      .addOrderBy('episode.createdAt', 'ASC')
      .take(20)
      .getMany();
  }
}