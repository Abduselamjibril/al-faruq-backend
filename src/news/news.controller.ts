// src/news/news.controller.ts

import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { PaginationResponseDto } from '../utils/pagination.dto';
import { CreateNewsDto } from './dto/create-news.dto';
import { NewsQueryDto } from './dto/news-query.dto';
import { UpdateNewsDto } from './dto/update-news.dto';
import { News } from './entities/news.entity';
import { NewsService } from './news.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../database/seed.service';

@ApiTags('News')
@Controller('news')
export class NewsController {
  constructor(private readonly newsService: NewsService) {}

  // --- Public Endpoint ---

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get a paginated list of the latest news articles' })
  @ApiResponse({
    status: 200,
    description: 'A paginated list of news articles.',
    type: PaginationResponseDto,
  })
  findAll(
    @Query() query: NewsQueryDto,
  ): Promise<PaginationResponseDto<News>> {
    return this.newsService.findAll(query);
  }

  // --- Admin Endpoints ---

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.NEWS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new news article (Admin Only)' })
  @ApiResponse({ status: 201, description: 'The news article has been successfully created.', type: News })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  create(@Body() createNewsDto: CreateNewsDto): Promise<News> {
    return this.newsService.create(createNewsDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.NEWS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update an existing news article (Admin Only)' })
  @ApiResponse({ status: 200, description: 'The news article has been successfully updated.', type: News })
  @ApiResponse({ status: 404, description: 'News article not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateNewsDto: UpdateNewsDto,
  ): Promise<News> {
    return this.newsService.update(id, updateNewsDto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.NEWS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a news article (Admin Only)' })
  @ApiResponse({ status: 200, description: 'The news article has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'News article not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsService.remove(id);
  }
}