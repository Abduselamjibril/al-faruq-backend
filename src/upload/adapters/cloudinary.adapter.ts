// src/upload/adapters/cloudinary.adapter.ts

import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';
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
    type: 'video' | 'thumbnail' | 'audio', // --- [MODIFIED] ADDED 'audio' TYPE ---
  ): Promise<UploadResult> {
    if (!file) {
      throw new InternalServerErrorException(
        'No file provided to upload adapter.',
      );
    }

    try {
      const result = await this.uploadStream(file, folder, type);

      if (type === 'video') {
        const eagerResult = result.eager?.[0];
        if (!eagerResult || !eagerResult.secure_url) {
          throw new InternalServerErrorException(
            'Cloudinary did not return an eager transformation result for the video.',
          );
        }
        const hlsUrl = eagerResult.secure_url.replace(/\.mp4$/, '.m3u8');
        return {
          url: hlsUrl,
          provider_id: result.public_id,
        };
      } else {
        // For thumbnails and audio, the original secure_url is correct.
        return {
          url: result.secure_url,
          provider_id: result.public_id,
        };
      }
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
    type: 'video' | 'thumbnail' | 'audio', // --- [MODIFIED] ADDED 'audio' TYPE ---
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      // --- [MODIFIED] LOGIC FOR RESOURCE TYPE ---
      let resourceType: 'video' | 'image' = 'image';
      if (type === 'video' || type === 'audio') {
        // Cloudinary treats audio files as a 'video' resource type
        resourceType = 'video';
      }

      const options: any = {
        folder: folder,
        resource_type: resourceType,
      };

      // Apply HLS transcoding only for actual video files
      if (type === 'video') {
        options.eager = [
          { streaming_profile: 'hd', format: 'm3u8' },
        ];
      }
      // --- [END OF MODIFICATION] ---

      const uploadStream = cloudinary.uploader.upload_stream(
        options,
        (
          error: UploadApiErrorResponse | undefined,
          result: UploadApiResponse | undefined,
        ) => {
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