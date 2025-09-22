// src/youtube/youtube.controller.ts

import { Controller, Get, Logger } from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { PlaylistItemDto } from './dto/playlist-response.dto';

/**
 * The controller is responsible for handling incoming web requests
 * and returning responses to the client (our Flutter app).
 * The route for this controller is defined as '/youtube'.
 */
@Controller('youtube')
export class YoutubeController {
  private readonly logger = new Logger(YoutubeController.name);

  // We inject the YoutubeService so we can use its methods.
  constructor(private readonly youtubeService: YoutubeService) {}

  /**
   * Defines a GET endpoint that will be accessible at '/youtube/playlist'.
   * When a request is made to this URL, this method will be executed.
   * @returns A promise that resolves to an array of video data.
   */
  @Get('playlist')
  async getPlaylist(): Promise<PlaylistItemDto[]> {
    this.logger.log('Received request for YouTube playlist.');
    // The controller's only job is to call the service and return its result.
    // NestJS will automatically handle converting the result to JSON.
    return this.youtubeService.getPlaylistVideos();
  }
}