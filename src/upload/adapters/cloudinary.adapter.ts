// src/upload/adapters/cloudinary.adapter.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { IUploadAdapter, UploadResult } from './upload-adapter.interface';
import type { Express } from 'express';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryAdapter implements IUploadAdapter {
  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
      secure: true,
    });
  }

  async upload(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadResult> {
    if (!file) {
      throw new InternalServerErrorException('No file provided to upload adapter.');
    }

    try {
      const result = await this.uploadStream(file, folder);
      return {
        url: result.secure_url,
        provider_id: result.public_id,
      };
    } catch (error) {
      console.error('Cloudinary upload failed:', error);
      throw new InternalServerErrorException(
        'Failed to upload file to Cloudinary.',
      );
    }
  }

  private uploadStream(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'auto', // Let Cloudinary detect if it's an image or video
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }
          if (result) {
            resolve(result);
          } else {
            reject(new Error('Cloudinary upload stream returned no result.'));
          }
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}