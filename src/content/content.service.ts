import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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

  // --- THIS METHOD HAS BEEN UPDATED ---
  async remove(id: string): Promise<{ message: string }> {
    const content = await this.contentRepository.findOneBy({ id });
    if (!content) {
      throw new NotFoundException(`Content with ID ${id} not found.`);
    }
    await this.contentRepository.remove(content);
    // Return a success message object
    return { message: 'Content successfully deleted.' };
  }
  // --- END OF UPDATE ---

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
}