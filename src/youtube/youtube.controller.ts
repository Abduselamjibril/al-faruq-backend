// src/youtube/youtube.controller.ts

import {
  Controller,
  Get,
  Logger,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query, // 1. Import the 'Query' decorator
} from '@nestjs/common';
import { YoutubeService } from './youtube.service';
// 2. Import 'VideoStatus' for type validation and Swagger documentation
import { PlaylistItemDto, VideoStatus } from './dto/playlist-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery, // 3. Import 'ApiQuery' for Swagger
} from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/entities/role.entity';

@ApiTags('YouTube (User)', 'YouTube (Admin)') // Tagged for both user and admin sections
@ApiBearerAuth() // All endpoints in this controller require a JWT
@UseGuards(JwtAuthGuard) // Protect all endpoints with JWT authentication
@Controller('youtube')
export class YoutubeController {
  private readonly logger = new Logger(YoutubeController.name);

  constructor(private readonly youtubeService: YoutubeService) {}

  @Get('playlist')
  @ApiOperation({ summary: 'Get the cached YouTube playlist (for users)' })
  // 4. Add Swagger documentation for the new optional query parameter
  @ApiQuery({
    name: 'status',
    required: false,
    enum: VideoStatus,
    description: 'Filter videos by their privacy status (public, private, or unlisted).',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns the list of videos from the YouTube playlist.',
    type: [PlaylistItemDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  // 5. Update the method signature to accept the 'status' query parameter
  async getPlaylist(
    @Query('status') status?: VideoStatus,
  ): Promise<PlaylistItemDto[]> {
    this.logger.log(
      `Received request for YouTube playlist. Status filter: ${status || 'none'}`,
    );
    // 6. Pass the status parameter to the service method
    return this.youtubeService.getPlaylistVideos(status);
  }

  @Post('playlist/refresh')
  @UseGuards(RolesGuard) // Add the RolesGuard for this specific endpoint
  @Roles(RoleName.ADMIN) // Specify that only ADMINs can access this
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Force refresh the YouTube playlist cache (Admin Only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache successfully cleared and repopulated.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({
    status: 403,
    description: 'Forbidden. User is not an admin.',
  })
  async refreshPlaylistCache() {
    this.logger.log(
      'Received request from an Admin to refresh the YouTube playlist cache.',
    );
    await this.youtubeService.refreshPlaylistCache();
    return {
      message: 'YouTube playlist cache has been refreshed successfully.',
    };
  }
}