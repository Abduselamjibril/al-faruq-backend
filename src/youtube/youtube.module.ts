// src/youtube/youtube.module.ts

import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule'; // <-- 1. IMPORT the ScheduleModule
import { YoutubeController } from './youtube.controller';
import { YoutubeService } from './youtube.service';

@Module({
  imports: [
    ScheduleModule.forRoot(), // <-- 2. ADD ScheduleModule.forRoot() to the imports array
  ],
  controllers: [YoutubeController],
  providers: [YoutubeService],
})
export class YoutubeModule {}