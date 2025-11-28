// src/content/content.service.ts

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository } from 'typeorm';
import { Content, ContentType } from './entities/content.entity';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { CreatePricingDto } from './dto/create-pricing.dto';
import { PricingTier } from '../pricing/entities/pricing-tier.entity';
import { AudioTrack } from './entities/audio-track.entity';
import { Language } from './entities/language.entity';
import { CreateAudioTrackDto } from './dto/create-audio-track.dto';
import { UpdateAudioTrackDto } from './dto/update-audio-track.dto';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepository: Repository<Content>,
    @InjectRepository(PricingTier)
    private readonly pricingRepository: Repository<PricingTier>,
    @InjectRepository(AudioTrack) // --- [NEW] INJECT REPOSITORY ---
    private readonly audioTrackRepository: Repository<AudioTrack>,
    @InjectRepository(Language) // --- [NEW] INJECT REPOSITORY ---
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
      .leftJoinAndSelect('content.audioTracks', 'audioTracks') // --- [NEW] JOIN AUDIO TRACKS ---
      .leftJoinAndSelect('audioTracks.language', 'language') // --- [NEW] JOIN LANGUAGE INFO ---
      .where('content.id = :id', { id })
      .orderBy({
        'seasons.createdAt': 'ASC',
        'episodes.createdAt': 'ASC',
        'audioTracks.createdAt': 'ASC', // --- [NEW] ORDER AUDIO TRACKS ---
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

    if (
      content.type !== ContentType.MOVIE &&
      content.type !== ContentType.SERIES &&
      content.type !== ContentType.MUSIC_VIDEO
    ) {
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

  // --- [NEW] AUDIO TRACK MANAGEMENT METHODS ---

  async addAudioTrack(
    contentId: string,
    createAudioTrackDto: CreateAudioTrackDto,
  ): Promise<AudioTrack> {
    const content = await this.contentRepository.findOneBy({ id: contentId });
    if (!content) {
      throw new NotFoundException(`Content with ID ${contentId} not found.`);
    }
    if (content.type !== ContentType.QURAN_TAFSIR) {
      throw new BadRequestException(
        'Audio tracks can only be added to content of type QURAN_TAFSIR.',
      );
    }

    const language = await this.languageRepository.findOneBy({
      id: createAudioTrackDto.languageId,
    });
    if (!language) {
      throw new NotFoundException(
        `Language with ID ${createAudioTrackDto.languageId} not found.`,
      );
    }

    const existingTrack = await this.audioTrackRepository.findOne({
      where: {
        contentId,
        languageId: createAudioTrackDto.languageId,
      },
    });

    if (existingTrack) {
      throw new ConflictException(
        `An audio track for language '${language.name}' already exists for this content.`,
      );
    }

    const newTrack = this.audioTrackRepository.create({
      ...createAudioTrackDto,
      contentId: contentId,
    });

    return this.audioTrackRepository.save(newTrack);
  }

  async updateAudioTrack(
    trackId: string,
    updateAudioTrackDto: UpdateAudioTrackDto,
  ): Promise<AudioTrack> {
    const track = await this.audioTrackRepository.preload({
      id: trackId,
      ...updateAudioTrackDto,
    });

    if (!track) {
      throw new NotFoundException(`Audio track with ID ${trackId} not found.`);
    }

    return this.audioTrackRepository.save(track);
  }

  async removeAudioTrack(trackId: string): Promise<{ message: string }> {
    const track = await this.audioTrackRepository.findOneBy({ id: trackId });
    if (!track) {
      throw new NotFoundException(`Audio track with ID ${trackId} not found.`);
    }
    await this.audioTrackRepository.remove(track);
    return { message: 'Audio track successfully deleted.' };
  }

  // --- [END OF NEW] ---

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
      .take(20)
      .getMany();
  }

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
      .take(20)
      .getMany();
  }
}