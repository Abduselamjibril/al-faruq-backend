// src/upload/adapters/cloudinary.adapter.ts (Final Corrected Version)

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
    type: 'video' | 'thumbnail' | 'audio' | 'pdf',
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
        // --- [CORRECTED LOGIC] ---
        // We no longer manipulate the URL. The `secure_url` returned by Cloudinary
        // will now be correct because of the new upload options.
        return {
          url: result.secure_url,
          provider_id: result.public_id,
        };
        // --- [END OF CORRECTION] ---
      }
    } catch (error) {
      console.error(
        'Cloudinary upload failed. Full error object:',
        JSON.stringify(error, null, 2),
      );
      throw new InternalServerErrorException(
        'Failed to upload file to Cloudinary.',
      );
    }
  }

  private uploadStream(
    file: Express.Multer.File,
    folder: string,
    type: 'video' | 'thumbnail' | 'audio' | 'pdf',
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      let resourceType: 'video' | 'image' | 'raw' = 'image';
      if (type === 'video' || type === 'audio') {
        resourceType = 'video';
      } else if (type === 'pdf') {
        resourceType = 'raw';
      }

      const options: any = {
        folder: folder,
        resource_type: resourceType,
      };

      // --- [FINAL MODIFICATION] ---
      // This is the definitive fix. We instruct Cloudinary to use the original
      // filename and add random characters to make it unique. This preserves
      // the .pdf extension in the public_id and the final URL.
      if (type === 'pdf') {
        options.use_filename = true;
        options.unique_filename = true;
      }
      // --- [END OF FINAL MODIFICATION] ---

      if (type === 'video') {
        options.eager = [
          { streaming_profile: 'hd', format: 'm3u8' },
        ];
      }

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