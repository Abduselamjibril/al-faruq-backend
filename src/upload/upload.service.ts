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
    type: 'video' | 'thumbnail' | 'audio' | 'pdf', // --- [MODIFIED] ADDED 'pdf' TYPE ---
  ): Promise<UploadResult> {
    // We can define different folders in the cloud based on the type
    let folder: string;
    switch (type) {
      case 'video':
        folder = 'alfaruq/videos';
        break;
      case 'thumbnail':
        folder = 'alfaruq/thumbnails';
        break;
      case 'audio':
        folder = 'alfaruq/audio';
        break;
      // --- [NEW] DEDICATED FOLDER FOR PDFS ---
      case 'pdf':
        folder = 'alfaruq/books';
        break;
      default:
        folder = 'alfaruq/others';
        break;
    }

    // We now pass the 'type' parameter through to the adapter.
    return this.uploadAdapter.upload(file, folder, type);
  }
}