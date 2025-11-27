import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Content, ContentType } from './entities/content.entity';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { CreatePricingDto } from './dto/create-pricing.dto';
import { PricingTier } from '../pricing/entities/pricing-tier.entity';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectRepository(PricingTier)
    private readonly pricingRepository: Repository<PricingTier>,
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
        { type: ContentType.MOVIE },
        { type: ContentType.SERIES },
        { type: ContentType.MUSIC_VIDEO },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  async findOneWithHierarchy(id: string): Promise<Content> {
    const content = await this.contentRepository
      .createQueryBuilder('content')
      .leftJoinAndSelect('content.children', 'seasons')
      .leftJoinAndSelect('seasons.children', 'episodes')
      .leftJoinAndSelect('content.pricingTier', 'pricingTier')
      .where('content.id = :id', { id })
      .orderBy({
        'seasons.createdAt': 'ASC',
        'episodes.createdAt': 'ASC',
      })
      .getOne();

    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found.`);
    }
    return content;
  }

  async update(id: string, updateContentDto: UpdateContentDto): Promise<Content> {
    const content = await this.contentRepository.preload({
      id: id,
      ...updateContentDto,
    });

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

  async lockContent(id: string, createPricingDto: CreatePricingDto): Promise<Content> {
    const content = await this.findOneWithHierarchy(id);

    if (content.type !== ContentType.MOVIE && content.type !== ContentType.SERIES && content.type !== ContentType.MUSIC_VIDEO) {
      throw new Error('Locking is only permitted for MOVIES, SERIES, or MUSIC VIDEOS.');
    }

    let pricingTier = content.pricingTier;
    if (pricingTier) {
      pricingTier.basePrice = createPricingDto.basePrice;
      pricingTier.baseDurationDays = createPricingDto.baseDurationDays;
      pricingTier.additionalTiers = createPricingDto.additionalTiers;
    } else {
      pricingTier = this.pricingRepository.create(createPricingDto);
    }
    
    content.pricingTier = pricingTier;
    content.isLocked = true;

    return this.contentRepository.save(content);
  }

  async unlockContent(id: string): Promise<Content> {
    const content = await this.contentRepository.findOneBy({ id });
    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found.`);
    }

    content.isLocked = false;
    return this.contentRepository.save(content);
  }

  // --- [NEW METHOD 1 START] ---
  /**
   * Searches for top-level content (Movies, Series, Music Videos).
   * @param query The user's search term.
   * @returns A promise that resolves to an array of content items.
   */
  async searchTopLevelContent(query: string): Promise<Content[]> {
    const searchTerm = `%${query.toLowerCase()}%`;

    return this.contentRepository
      .createQueryBuilder('content')
      .where('content.type IN (:...types)', {
        types: [ContentType.MOVIE, ContentType.SERIES, ContentType.MUSIC_VIDEO],
      })
      .andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(content.title) LIKE :searchTerm', { searchTerm }).orWhere(
            'LOWER(content.description) LIKE :searchTerm',
            { searchTerm },
          );
        }),
      )
      .orderBy('content.createdAt', 'DESC')
      .take(20) // Limit the number of results for performance
      .getMany();
  }
  // --- [NEW METHOD 1 END] ---

  // --- [NEW METHOD 2 START] ---
  /**
   * Searches for episodes based on the episode title or its parent series title.
   * @param query The user's search term.
   * @returns A promise that resolves to an array of episode content items.
   */
  async searchEpisodes(query: string): Promise<Content[]> {
    const searchTerm = `%${query.toLowerCase()}%`;

    return this.contentRepository
      .createQueryBuilder('episode')
      .leftJoinAndSelect('episode.parent', 'season')
      .leftJoinAndSelect('season.parent', 'series')
      .where('episode.type = :type', { type: ContentType.EPISODE })
      .andWhere(
        new Brackets((qb) => {
          qb.where('LOWER(episode.title) LIKE :searchTerm', {
            searchTerm,
          }).orWhere('LOWER(series.title) LIKE :searchTerm', { searchTerm });
        }),
      )
      .orderBy('series.title', 'ASC')
      .addOrderBy('episode.createdAt', 'ASC')
      .take(20) // Limit the number of results for performance
      .getMany();
  }
  // --- [NEW METHOD 2 END] ---
}