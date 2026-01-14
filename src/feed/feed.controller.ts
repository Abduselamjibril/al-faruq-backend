// src/feed/feed.controller.ts

import {
  Controller,
  Get,
  Inject,
  Param,
  ParseUUIDPipe,
  UseGuards,
  createParamDecorator,
  ExecutionContext,
  Query,
} from '@nestjs/common';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import { FeedService } from './feed.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RoleName } from '../roles/entities/role.entity';
import { Roles } from '../auth/decorators/roles.decorator';
import { Content } from '../content/entities/content.entity';
import { FeedQueryDto } from './dto/feed-query.dto';
import { PaginationResponseDto } from '../utils/pagination.dto';

// This custom decorator correctly extracts the user object from the request.
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

@ApiTags('Feed (User-Facing)')
@Controller('feed')
export class FeedController {
  constructor(
    private readonly feedService: FeedService,
    // This correctly injects the global cache manager service.
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER, RoleName.GUEST)
  @Get()
  @ApiOperation({
    summary: "Get the paginated and filterable main content feed for the user's home screen",
  })
  @ApiResponse({ status: 200, description: 'Returns a paginated and personalized list of top-level content items.', type: PaginationResponseDto })
  async getFeed(
    @GetUser() user: { id: string },
    @Query() query: FeedQueryDto,
  ): Promise<PaginationResponseDto<Content>> {
    // --- START: Manual Caching Logic ---

    // 1. Create a stable, unique cache key from the user ID and all query parameters.
    const queryParamsString = Object.entries(query)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB)) // Sort to ensure key is consistent regardless of param order
      .filter(([, value]) => value !== undefined && value !== null) // Ignore empty params
      .map(([key, value]) => `${key}=${value}`)
      .join('&');
      
    const cacheKey = `feed_user:${user.id}_query:${queryParamsString || 'default'}`;

    // 2. Try to retrieve data from the cache.
    const cachedData = await this.cacheManager.get<PaginationResponseDto<Content>>(cacheKey);
    if (cachedData) {
      console.log(`--- SUCCESS: Serving feed from CACHE! (Key: ${cacheKey}) ---`);
      return cachedData;
    }

    // 3. If not in cache, fetch from the service.
    console.log(`--- INFO: Feed not in cache. Fetching from database... (Key: ${cacheKey}) ---`);
    const dbData = await this.feedService.getFeed(user.id, query);
    
    // 4. Store the result in the cache for 60 seconds.
    await this.cacheManager.set(cacheKey, dbData, 60); 

    return dbData;
    // --- END: Manual Caching Logic ---
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER)
  @Get('my-purchases')
  @ApiOperation({
    summary: 'Get all content the user has access to, with pagination and filtering',
  })
  @ApiResponse({ status: 200, description: 'Returns a paginated list of content items for which the user has an active entitlement.', type: PaginationResponseDto })
  getMyPurchases(
    @GetUser() user: { id: string },
    @Query() query: FeedQueryDto,
  ): Promise<PaginationResponseDto<Content>> {
    // Note: Caching is not applied here, but could be added using the same pattern.
    return this.feedService.getMyPurchases(user.id, query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER, RoleName.GUEST)
  @Get(':id')
  @ApiOperation({ summary: 'Get detailed information for a specific content item' })
  @ApiResponse({ status: 200, description: 'Returns the full content hierarchy, including pricing if not owned.', type: Content })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  getContent(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { id: string },
  ) {
    // Note: Caching could be added here with a key like `content_detail_${id}_user_${user.id}`
    return this.feedService.getContentForUser(id, user.id);
  }
}