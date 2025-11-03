// src/upload/upload.service.ts

import { Injectable, Inject } from '@nestjs/common';
// --- THIS IS THE FIX ---
import type {
  IUploadAdapter,
  UploadResult,
} from './adapters/upload-adapter.interface';
import { UPLOAD_ADAPTER_TOKEN } from './adapters/upload-adapter.interface';
// --- END OF FIX ---
import type { Express } from 'express';

@Injectable()
export class UploadService {
  constructor(
    @Inject(UPLOAD_ADAPTER_TOKEN)
    private readonly uploadAdapter: IUploadAdapter,
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    type: 'video' | 'thumbnail',
  ): Promise<UploadResult> {
    // We can define different folders in the cloud based on the type
    const folder = type === 'video' ? 'alfaruq/videos' : 'alfaruq/thumbnails';
    return this.uploadAdapter.upload(file, folder);
  }
}