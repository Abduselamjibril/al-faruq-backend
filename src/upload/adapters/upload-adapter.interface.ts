// src/upload/adapters/upload-adapter.interface.ts

import type { Express } from 'express';

export interface UploadResult {
  url: string; // The public URL of the uploaded file
  provider_id: string; // The unique ID for the file on the provider's system (e.g., Cloudinary's public_id)
}

export interface IUploadAdapter {
  upload(file: Express.Multer.File, folder: string): Promise<UploadResult>;
}

// We use an injection token to make our adapter swappable
export const UPLOAD_ADAPTER_TOKEN = 'UploadAdapterToken';