// src/feed/feed.controller.ts

import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { FeedService } from './feed.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

// To avoid duplication, this should ideally be moved to its own file, e.g., src/auth/decorators/get-user.decorator.ts
export const GetUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

@ApiTags('Feed (User)')
@ApiBearerAuth()
@Controller('feed')
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @ApiOperation({ summary: "Get the main content feed for the user's home screen" })
  @ApiResponse({ status: 200, description: 'Returns a list of all top-level content items (movies, series, etc.).' })
  @ApiResponse({ status: 401, description: 'Unauthorized. A valid JWT is required.' })
  @Get()
  getFeed() {
    return this.feedService.getFeed();
  }

  @ApiOperation({ summary: 'Get detailed information for a specific content item' })
  @ApiResponse({ status: 200, description: 'Returns the full content hierarchy. Video URLs will be null if the user has not purchased the content.' })
  @ApiResponse({ status: 401, description: 'Unauthorized. A valid JWT is required.' })
  @ApiResponse({ status: 404, description: 'Content with the specified ID not found.' })
  @Get(':id')
  getContent(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: { id: number },
  ) {
    return this.feedService.getContentForUser(id, user.id);
  }
}