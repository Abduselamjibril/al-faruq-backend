// src/news/news.service.ts

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindManyOptions, ILike, Repository } from 'typeorm';
import { PaginationResponseDto } from '../utils/pagination.dto';
import { CreateNewsDto } from './dto/create-news.dto';
import { NewsQueryDto } from './dto/news-query.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { News } from './entities/news.entity';

@Injectable()
export class NewsService {
  constructor(
    @InjectRepository(News)
    private readonly newsRepository: Repository<News>,
  ) {}

  // --- User-Facing Method ---

  async findAll(query: NewsQueryDto): Promise<PaginationResponseDto<News>> {
    const { page, limit, category } = query;
    const take = limit || 10;
    const skip = ((page || 1) - 1) * take;

    const where: FindManyOptions<News>['where'] = {};
    if (category) {
      // Use ILike for case-insensitive search
      where.category = ILike(`%${category}%`);
    }

    const [results, total] = await this.newsRepository.findAndCount({
      where,
      order: { createdAt: 'DESC' }, // Sort by latest
      take,
      skip,
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

  // --- Admin-Facing Methods ---

  async create(createNewsDto: CreateNewsDto): Promise<News> {
    const news = this.newsRepository.create(createNewsDto);
    return this.newsRepository.save(news);
  }

  async findOne(id: string): Promise<News> {
    const news = await this.newsRepository.findOneBy({ id });
    if (!news) {
      throw new NotFoundException(`News article with ID ${id} not found.`);
    }
    return news;
  }

  async update(id: string, updateNewsDto: UpdateNewsDto): Promise<News> {
    const news = await this.newsRepository.preload({
      id,
      ...updateNewsDto,
    });

    if (!news) {
      throw new NotFoundException(`News article with ID ${id} not found.`);
    }

    return this.newsRepository.save(news);
  }

  async remove(id: string): Promise<{ message: string }> {
    const news = await this.findOne(id);
    await this.newsRepository.remove(news);
    return { message: `News article '${news.title}' successfully deleted.` };
  }
}