// src/language/language.service.ts

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from '../content/entities/language.entity';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';

@Injectable()
export class LanguageService {
  constructor(
    @InjectRepository(Language)
    private readonly languageRepository: Repository<Language>,
  ) {}

  async create(createLanguageDto: CreateLanguageDto): Promise<Language> {
    const { name, code } = createLanguageDto;

    // Check for existing name or code to prevent duplicates
    const existingLanguage = await this.languageRepository
      .createQueryBuilder('language')
      .where('LOWER(language.name) = LOWER(:name)', { name })
      .orWhere('LOWER(language.code) = LOWER(:code)', { code })
      .getOne();

    if (existingLanguage) {
      throw new ConflictException(
        'A language with this name or code already exists.',
      );
    }

    const newLanguage = this.languageRepository.create(createLanguageDto);
    return this.languageRepository.save(newLanguage);
  }

  findAll(): Promise<Language[]> {
    return this.languageRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Language> {
    const language = await this.languageRepository.findOneBy({ id });
    if (!language) {
      throw new NotFoundException(`Language with ID ${id} not found.`);
    }
    return language;
  }

  async update(
    id: string,
    updateLanguageDto: UpdateLanguageDto,
  ): Promise<Language> {
    const language = await this.languageRepository.preload({
      id,
      ...updateLanguageDto,
    });

    if (!language) {
      throw new NotFoundException(`Language with ID ${id} not found.`);
    }

    // Optional: Add duplicate check for update as well
    const { name, code } = updateLanguageDto;
    if (name || code) {
      const qb = this.languageRepository
        .createQueryBuilder('language')
        .where('language.id != :id', { id });

      if (name) {
        qb.andWhere('LOWER(language.name) = LOWER(:name)', { name });
      }
      if (code) {
        qb.andWhere('LOWER(language.code) = LOWER(:code)', { code });
      }

      const existingLanguage = await qb.getOne();
      if (existingLanguage) {
        throw new ConflictException(
          'Another language with this name or code already exists.',
        );
      }
    }

    return this.languageRepository.save(language);
  }

  async remove(id: string): Promise<{ message: string }> {
    const language = await this.findOne(id);
    await this.languageRepository.remove(language);
    return { message: `Language '${language.name}' successfully deleted.` };
  }
}