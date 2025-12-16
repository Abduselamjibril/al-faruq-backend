// src/feed/feed.controller.ts

import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  createParamDecorator,
  ExecutionContext,
  Query,
} from '@nestjs/common';
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

// To avoid duplication, this decorator should be in its own file (e.g., src/auth/decorators/get-user.decorator.ts)
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

@ApiTags('Feed (User-Facing)')
@Controller('feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  // --- [REMOVED] The old @Public @Get('tafsir') endpoint is deleted. ---

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER, RoleName.GUEST)
  @Get()
  @ApiOperation({
    summary: "Get the paginated and filterable main content feed for the user's home screen (User Only)",
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated and personalized list of top-level content items.',
    type: PaginationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  getFeed(
    @GetUser() user: { id: number },
    @Query() query: FeedQueryDto,
  ): Promise<PaginationResponseDto<Content>> {
    return this.feedService.getFeed(user.id, query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER)
  @Get('my-purchases')
  @ApiOperation({
    summary: "Get all content the user has actively rented/purchased, with pagination and filtering (User Only)",
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a paginated list of content items for which the user has an active rental.',
    type: PaginationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid query parameters.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  getMyPurchases(
    @GetUser() user: { id: number },
    @Query() query: FeedQueryDto,
  ): Promise<PaginationResponseDto<Content>> {
    return this.feedService.getMyPurchases(user.id, query);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER, RoleName.GUEST)
  @Get(':id')
  @ApiOperation({ summary: 'Get detailed information for a specific content item (User Only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns the full content hierarchy.',
    type: Content,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  getContent(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { id: number },
  ) {
    return this.feedService.getContentForUser(id, user.id);
  }
}