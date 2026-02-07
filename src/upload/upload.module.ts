// src/upload/upload.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { UPLOAD_ADAPTER_TOKEN } from './adapters/upload-adapter.interface';
import { BunnyAdapter } from './adapters/bunny.adapter';
import { BunnyUploadService } from './bunny-upload.service';
import { BunnyStreamService } from '../stream/bunny-stream.service';

@Module({
  imports: [ConfigModule], // Import ConfigModule so BunnyAdapter can use it
  controllers: [UploadController],
  providers: [
    UploadService,
    BunnyUploadService,
    BunnyStreamService,
    // --- This is the core of our adapter pattern ---
    {
      provide: UPLOAD_ADAPTER_TOKEN,
      useClass: BunnyAdapter, // <-- Swapped to BunnyAdapter for Bunny.net integration
    },
  ],
  exports: [UploadService],
})
export class UploadModule {}