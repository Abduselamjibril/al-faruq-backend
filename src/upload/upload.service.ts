// src/upload/upload.service.ts

import { Injectable, Inject } from '@nestjs/common';
import type {
  IUploadAdapter,
  UploadResult,
} from './adapters/upload-adapter.interface';
import { UPLOAD_ADAPTER_TOKEN } from './adapters/upload-adapter.interface';
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

    // --- UPDATED METHOD CALL ---
    // We now pass the 'type' parameter through to the adapter.
    return this.uploadAdapter.upload(file, folder, type); // <-- PASS 'type' as the third argument
  }
}