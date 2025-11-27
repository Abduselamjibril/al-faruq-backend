import {
  Controller,
  Get,
  Logger,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { PlaylistItemDto, VideoStatus } from './dto/playlist-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/entities/role.entity';

@ApiTags('YouTube') // --- 1. CLEANED UP ApiTags ---
@ApiBearerAuth()
@Controller('youtube')
export class YoutubeController {
  private readonly logger = new Logger(YoutubeController.name);

  constructor(private readonly youtubeService: YoutubeService) {}

  @Get('playlist')
  // --- 2. APPLIED STRICT GUARDS ---
  @UseGuards(JwtAuthGuard, RolesGuard)
  // --- 3. EXPLICITLY DEFINED ROLES ---
  @Roles(RoleName.USER, RoleName.ADMIN)
  @ApiOperation({ summary: 'Get the cached YouTube playlist' })
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
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  async getPlaylist(
    @Query('status') status?: VideoStatus,
  ): Promise<PlaylistItemDto[]> {
    this.logger.log(
      `Received request for YouTube playlist. Status filter: ${status || 'none'}`,
    );
    return this.youtubeService.getPlaylistVideos(status);
  }

  @Post('playlist/refresh')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Force refresh the YouTube playlist cache (Admin Only)', // --- 4. UPDATED SUMMARY ---
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