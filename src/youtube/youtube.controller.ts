// src/youtube/youtube.controller.ts

import {
  Controller,
  Get,
  Logger,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { PlaylistItemDto } from './dto/playlist-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
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
  @ApiResponse({
    status: 200,
    description: 'Returns the list of videos from the YouTube playlist.',
    type: [PlaylistItemDto],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  async getPlaylist(): Promise<PlaylistItemDto[]> {
    this.logger.log('Received request for YouTube playlist.');
    return this.youtubeService.getPlaylistVideos();
  }

  @Post('playlist/refresh')
  @UseGuards(RolesGuard) // Add the RolesGuard for this specific endpoint
  @Roles(RoleName.ADMIN) // Specify that only ADMINs can access this
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force refresh the YouTube playlist cache (Admin Only)' })
  @ApiResponse({
    status: 200,
    description: 'Cache successfully cleared and repopulated.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User is not an admin.' })
  async refreshPlaylistCache() {
    this.logger.log('Received request from an Admin to refresh the YouTube playlist cache.');
    await this.youtubeService.refreshPlaylistCache();
    return { message: 'YouTube playlist cache has been refreshed successfully.' };
  }
}