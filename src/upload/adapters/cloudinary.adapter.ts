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

  // --- 1. UPDATE the public 'upload' method signature to accept the 'type' ---
  async upload(
    file: Express.Multer.File,
    folder: string,
    type: 'video' | 'thumbnail',
  ): Promise<UploadResult> {
    if (!file) {
      throw new InternalServerErrorException(
        'No file provided to upload adapter.',
      );
    }

    try {
      // --- 2. PASS the 'type' down to the streaming method ---
      const result = await this.uploadStream(file, folder, type);

      // --- 3. LOGIC to return the correct URL ---
      if (type === 'video') {
        // For videos, the result we want is in the 'eager' array.
        // We must change the file extension from .mp4 to .m3u8 to get the HLS manifest URL.
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
        // For thumbnails, the original URL is correct.
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

  // --- 4. UPDATE the private 'uploadStream' method to accept 'type' and apply options ---
  private uploadStream(
    file: Express.Multer.File,
    folder: string,
    type: 'video' | 'thumbnail',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      // --- 5. DEFINE the dynamic upload options ---
      const options: any = {
        folder: folder,
        resource_type: type === 'video' ? 'video' : 'image',
      };

      // --- THIS IS THE CORE OF THE IMPLEMENTATION ---
      // If the upload is a video, add the 'eager' transcoding option.
      if (type === 'video') {
        options.eager = [
          // This tells Cloudinary to create an adaptive bitrate HLS stream.
          // `sp_hd` is a preset that creates multiple quality levels (e.g., 360p, 480p, 720p, 1080p).
          { streaming_profile: 'hd', format: 'm3u8' },
        ];
        // This notifies our webhook (optional, but good for advanced workflows)
        // options.eager_notification_url = 'YOUR_WEBHOOK_URL_HERE';
      }
      // --- END OF CORE IMPLEMENTATION ---

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