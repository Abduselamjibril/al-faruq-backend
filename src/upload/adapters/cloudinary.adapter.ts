import {
  Injectable,
  InternalServerErrorException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  v2 as cloudinary,
  UploadApiErrorResponse,
  UploadApiResponse,
} from 'cloudinary';
import { IUploadAdapter, UploadResult } from './upload-adapter.interface';
import type { Express } from 'express';
import * as streamifier from 'streamifier';
import * as path from 'path';

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
      // --- [NEW LOGIC] Special handling for PDFs to check for duplicates ---
      if (type === 'pdf') {
        const fileNameWithoutExt = path.parse(file.originalname).name;
        const publicId = `${folder}/${fileNameWithoutExt}`;

        console.log(`[Adapter] Checking for existence of public_id: ${publicId}`);

        const exists = await this.resourceExists(publicId);
        if (exists) {
          throw new ConflictException(
            `File with name "${file.originalname}" already exists.`,
          );
        }

        // If it does not exist, proceed with a controlled upload
        const result = await this.uploadStream(file, {
          folder: folder,
          public_id: publicId,
          resource_type: 'raw',
          overwrite: false, // Important safety rule
        });

        console.log(
          '[Adapter] Cloudinary upload successful. Response:',
          JSON.stringify(result, null, 2),
        );

        return {
          url: result.secure_url,
          provider_id: result.public_id,
        };
      } else {
        // --- Original logic for non-PDF files ---
        console.log(`[Adapter] Starting upload for file: ${file.originalname}`);
        const resourceType = (type === 'video' || type === 'audio') ? 'video' : 'image';
        const result = await this.uploadStream(file, {
          folder: folder,
          resource_type: resourceType,
        });

        console.log(
          '[Adapter] Cloudinary upload successful. Response:',
          JSON.stringify(result, null, 2),
        );

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
        }

        return {
          url: result.secure_url,
          provider_id: result.public_id,
        };
      }
    } catch (error) {
      // Re-throw ConflictException directly, otherwise wrap other errors
      if (error instanceof ConflictException) {
        throw error;
      }
      console.error(
        'Cloudinary upload failed. Full error object:',
        JSON.stringify(error, null, 2),
      );
      throw new InternalServerErrorException('Failed to upload file to Cloudinary.');
    }
  }

  private async resourceExists(publicId: string): Promise<boolean> {
    try {
      await cloudinary.api.resource(publicId, { resource_type: 'raw' });
      // If the above line does not throw an error, the resource exists.
      return true;
    } catch (error) {
      // Cloudinary throws an error with `not_found: true` if it doesn't exist.
      if (error && error.error && error.error.message === 'Resource not found') {
        return false;
      }
      // If it's a different error (e.g., API connection issue), re-throw it.
      throw error;
    }
  }

  private uploadStream(
    file: Express.Multer.File,
    options: any,
  ): Promise<UploadApiResponse> {
    return new Promise((resolve, reject) => {
      const uploadOptions = { ...options };

      // Apply HLS transcoding only for actual video files
      if (uploadOptions.resource_type === 'video') {
        uploadOptions.eager = [
          { streaming_profile: 'hd', format: 'm3u8' },
        ];
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
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