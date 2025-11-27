// src/youtube/youtube.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { YoutubeController } from './youtube.controller';
import { YoutubeService } from './youtube.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
  ],
  controllers: [YoutubeController],
  providers: [YoutubeService],
  exports: [YoutubeService], // <-- ADD THIS LINE
})
export class YoutubeModule {}