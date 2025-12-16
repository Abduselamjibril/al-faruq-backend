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
import {
  PlaylistItemDto,
  VideoStatus,
  ChannelName, // This import is essential
} from './dto/playlist-response.dto';
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

@ApiTags('YouTube')
@ApiBearerAuth()
@Controller('youtube')
export class YoutubeController {
  private readonly logger = new Logger(YoutubeController.name);

  constructor(private readonly youtubeService: YoutubeService) {}

  @Get('playlist')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER, RoleName.ADMIN, RoleName.GUEST)
  @ApiOperation({ summary: 'Get the cached YouTube playlist' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: VideoStatus,
    description:
      'Filter videos by their privacy status (public, private, or unlisted).',
  })
  // This is the part that creates the dropdown
  @ApiQuery({
    name: 'channel',
    required: false,
    enum: ChannelName, // It MUST use the enum here
    description:
      'Filter videos by a specific channel title. If not provided, all videos are returned.',
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
    @Query('channel') channel?: ChannelName,
  ): Promise<PlaylistItemDto[]> {
    this.logger.log(
      `Received request for YouTube playlist. Status filter: ${
        status || 'none'
      }, Channel filter: ${channel || 'none'}`,
    );
    return this.youtubeService.getPlaylistVideos(status, channel);
  }

  @Post('playlist/refresh')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
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