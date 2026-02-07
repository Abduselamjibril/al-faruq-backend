import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class BunnyStreamService {
  private readonly libraryId: string;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly cdnUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.libraryId = this.configService.get<string>('BUNNY_STREAM_LIBRARY_ID') ?? '';
    this.apiKey = this.configService.get<string>('BUNNY_STREAM_API_KEY') ?? '';
    this.baseUrl = this.configService.get<string>('BUNNY_STREAM_BASE_URL') ?? 'https://video.bunnycdn.com';
    this.cdnUrl = this.configService.get<string>('BUNNY_STREAM_CDN_URL') ?? '';
    if (!this.libraryId || !this.apiKey || !this.baseUrl || !this.cdnUrl) {
      throw new Error('Bunny.net Stream configuration is missing in environment variables.');
    }
  }

  /**
   * Upload a video file to Bunny.net Stream
   */
  async uploadVideo(fileBuffer: Buffer, fileName: string): Promise<{ videoId: string; url: string; hlsUrl: string }> {
    try {
      // 1. Create a video entry
      const createRes = await axios.post(
        `${this.baseUrl}/library/${this.libraryId}/videos`,
        { title: fileName },
        { headers: { AccessKey: this.apiKey } }
      );
      const videoId = createRes.data.guid;
      if (!videoId) throw new Error('Failed to create video entry.');

      // 2. Upload the video file
      await axios.put(
        `${this.baseUrl}/library/${this.libraryId}/videos/${videoId}`,
        fileBuffer,
        {
          headers: {
            AccessKey: this.apiKey,
            'Content-Type': 'application/octet-stream',
          },
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      // 3. Return the playback URL and HLS URL
      const url = `${this.cdnUrl}/${videoId}`;
      const hlsUrl = `${this.cdnUrl}/${videoId}/playlist.m3u8`;
      return { videoId, url, hlsUrl };
    } catch (error) {
      throw new InternalServerErrorException('Failed to upload video to Bunny.net Stream.');
    }
  }

  /**
   * Get the playback URL for a video
   */
  getPlaybackUrl(videoId: string): string {
    return `${this.cdnUrl}/${videoId}`;
  }
  getHlsUrl(videoId: string): string {
    return `${this.cdnUrl}/${videoId}/playlist.m3u8`;
  }

  /**
   * Check if a video is ready for streaming (processed)
   */
  async isVideoReady(videoId: string): Promise<boolean> {
    try {
      const res = await axios.get(
        `${this.baseUrl}/library/${this.libraryId}/videos/${videoId}`,
        { headers: { AccessKey: this.apiKey } }
      );
      // Bunny.net marks status 3 as 'ready'
      return res.data.status === 3;
    } catch (error) {
      return false;
    }
  }
}
