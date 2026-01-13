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
  // --- [CHANGED] Only inject FeedService ---
  constructor(private readonly feedService: FeedService) {}

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER, RoleName.GUEST)
  @Get()
  @ApiOperation({
    summary: "Get the paginated and filterable main content feed for the user's home screen",
  })
  @ApiResponse({ status: 200, description: 'Returns a paginated and personalized list of top-level content items.', type: PaginationResponseDto })
  getFeed(
    @GetUser() user: { id: number },
    @Query() query: FeedQueryDto,
  ): Promise<PaginationResponseDto<Content>> {
    return this.feedService.getFeed(user.id, query);
  }

  // --- [RESTORED] Renamed back to my-purchases ---
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER)
  @Get('my-purchases')
  @ApiOperation({
    summary: 'Get all content the user has access to, with pagination and filtering',
  })
  @ApiResponse({ status: 200, description: 'Returns a paginated list of content items for which the user has an active entitlement.', type: PaginationResponseDto })
  getMyPurchases(
    @GetUser() user: { id: number },
    @Query() query: FeedQueryDto,
  ): Promise<PaginationResponseDto<Content>> {
    return this.feedService.getMyPurchases(user.id, query);
  }

  // --- [REMOVED] The separate '/:id/access' endpoint is gone. ---

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER, RoleName.GUEST)
  @Get(':id')
  @ApiOperation({ summary: 'Get detailed information for a specific content item' })
  @ApiResponse({ status: 200, description: 'Returns the full content hierarchy, including pricing if not owned.', type: Content })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  getContent(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { id: number },
  ) {
    return this.feedService.getContentForUser(id, user.id);
  }
}