// src/upload/upload.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';
import { UPLOAD_ADAPTER_TOKEN } from './adapters/upload-adapter.interface';
import { CloudinaryAdapter } from './adapters/cloudinary.adapter';

@Module({
  imports: [ConfigModule], // Import ConfigModule so CloudinaryAdapter can use it
  controllers: [UploadController],
  providers: [
    UploadService,
    // --- This is the core of our adapter pattern ---
    {
      provide: UPLOAD_ADAPTER_TOKEN,
      useClass: CloudinaryAdapter, // <-- Swap this class to change upload provider
    },
  ],
})
export class UploadModule {}