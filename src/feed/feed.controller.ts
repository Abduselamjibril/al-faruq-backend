// src/feed/feed.controller.ts

import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  createParamDecorator,
  ExecutionContext,
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
import { Public } from '../auth/decorators/public.decorator';
import { Content } from '../content/entities/content.entity';

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

  @Public()
  @Get('tafsir')
  @ApiOperation({
    summary: 'Get a list of all available Quran Tafsir content (Public)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all Tafsir content items.',
    type: [Content],
  })
  getAllTafsir() {
    return this.feedService.getAllTafsir();
  }

  // All endpoints below this require authentication
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER)
  @Get()
  @ApiOperation({
    summary: "Get the main content feed for the user's home screen (User Only)",
  })
  @ApiResponse({
    status: 200,
    description:
      "Returns a personalized list of all top-level content items. 'isLocked' will be false for any content the user has purchased.",
    type: [Content],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  getFeed(@GetUser() user: { id: number }) {
    return this.feedService.getFeed(user.id);
  }

  // --- [NEW] ENDPOINT FOR USER'S PURCHASES ---
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER)
  @Get('my-purchases')
  @ApiOperation({
    summary: "Get all content the user has actively rented/purchased (User Only)",
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns a list of content items for which the user has an active rental.',
    type: [Content],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  getMyPurchases(@GetUser() user: { id: number }) {
    return this.feedService.getMyPurchases(user.id);
  }
  // --- [END OF NEW] ---

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER)
  @Get(':id')
  @ApiOperation({ summary: 'Get detailed information for a specific content item (User Only)' })
  @ApiResponse({
    status: 200,
    description:
      'Returns the full content hierarchy. Video URLs will be null if the user has not purchased the content. For Tafsir, audio tracks are included.',
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