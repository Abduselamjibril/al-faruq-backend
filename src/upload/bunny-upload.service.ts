import { Injectable } from '@nestjs/common';
import { BunnyStreamService } from '../stream/bunny-stream.service';
import type { Express } from 'express';

@Injectable()
export class BunnyUploadService {
  constructor(private readonly bunnyStreamService: BunnyStreamService) {}

  async uploadVideo(file: Express.Multer.File) {
    // Use BunnyStreamService to upload and get streaming URL
    const { url, videoId, hlsUrl } = await this.bunnyStreamService.uploadVideo(file.buffer, file.originalname);
    // Poll for processing status (wait until ready or timeout)
    let ready = false;
    const maxWait = 120; // seconds
    const interval = 3; // seconds
    let waited = 0;
    while (!ready && waited < maxWait) {
      ready = await this.bunnyStreamService.isVideoReady(videoId);
      if (!ready) {
        await new Promise((res) => setTimeout(res, interval * 1000));
        waited += interval;
      }
    }
    return { url, videoId, hlsUrl, ready };
  }
}
