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
  Inject,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
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
  constructor(
    private readonly newsService: NewsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // --- Public Endpoint with Caching ---

  @Public()
  @Get()
  @ApiOperation({ summary: 'Get a paginated list of the latest news articles' })
  @ApiResponse({ status: 200, description: 'A paginated list of news articles.', type: PaginationResponseDto })
  async findAll(
    @Query() query: NewsQueryDto,
  ): Promise<PaginationResponseDto<News>> {
    const queryParamsString = `page=${query.page || 1}&limit=${query.limit || 10}`;
    const cacheKey = `news_list_${queryParamsString}`;

    const cachedData = await this.cacheManager.get<PaginationResponseDto<News>>(cacheKey);
    if (cachedData) {
      console.log(`--- SUCCESS: Serving news from CACHE! (Key: ${cacheKey}) ---`);
      return cachedData;
    }

    console.log(`--- INFO: News not in cache. Fetching from database... (Key: ${cacheKey}) ---`);
    const dbData = await this.newsService.findAll(query);
    
    // Cache news for 5 minutes (300 seconds)
    await this.cacheManager.set(cacheKey, dbData, 300); 

    return dbData;
  }

  // --- Admin Endpoints (Unchanged) ---

  @Post()
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.NEWS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ADMIN: Create a new news article' })
  create(@Body() createNewsDto: CreateNewsDto): Promise<News> {
    return this.newsService.create(createNewsDto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.NEWS_MANAGE)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'ADMIN: Update an existing news article' })
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
  @ApiOperation({ summary: 'ADMIN: Delete a news article' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.newsService.remove(id);
  }
}