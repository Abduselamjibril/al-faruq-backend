import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IUploadAdapter, UploadResult } from './upload-adapter.interface';
import type { Express } from 'express';
import axios from 'axios';

@Injectable()
export class BunnyAdapter implements IUploadAdapter {
  private readonly apiKey: string;
  private readonly storageZone: string;
  private readonly storageHost: string;

  private readonly cdnBase: string;
  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('BUNNY_STORAGE_API_KEY') ?? '';
    this.storageZone = this.configService.get<string>('BUNNY_STORAGE_ZONE') ?? '';
    this.storageHost = this.configService.get<string>('BUNNY_STORAGE_HOST') ?? '';
    this.cdnBase = this.configService.get<string>('BUNNY_CDN_URL') ?? '';
    if (!this.apiKey || !this.storageZone || !this.storageHost || !this.cdnBase) {
      throw new Error('Bunny.net storage configuration is missing in environment variables.');
    }
  }

  /**
   * List files in a folder (relative to the storage zone root)
   */
  async listFiles(folder = ''): Promise<any> {
    const url = `https://${this.storageHost}/${this.storageZone}/${folder}`;
    try {
      const response = await axios.get(url, {
        headers: { AccessKey: this.apiKey },
      });
      return response.data;
    } catch (error) {
      throw new InternalServerErrorException('Failed to list files from Bunny.net Storage.');
    }
  }

  /**
   * Download a file (returns Buffer)
   */
  async downloadFile(path: string): Promise<Buffer> {
    const url = `https://${this.storageHost}/${this.storageZone}/${path}`;
    try {
      const response = await axios.get(url, {
        headers: { AccessKey: this.apiKey },
        responseType: 'arraybuffer',
      });
      return Buffer.from(response.data);
    } catch (error) {
      throw new InternalServerErrorException('Failed to download file from Bunny.net Storage.');
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(path: string): Promise<void> {
    const url = `https://${this.storageHost}/${this.storageZone}/${path}`;
    try {
      await axios.delete(url, {
        headers: { AccessKey: this.apiKey },
      });
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete file from Bunny.net Storage.');
    }
  }

  async upload(
    file: Express.Multer.File,
    folder: string,
    type: 'video' | 'thumbnail' | 'audio' | 'pdf',
  ): Promise<UploadResult> {
    if (!file) {
      throw new InternalServerErrorException('No file provided to upload adapter.');
    }
    try {
      const fileName = file.originalname;
      const path = `${folder}/${fileName}`;
      const url = `https://${this.storageHost}/${this.storageZone}/${path}`;
      const response = await axios.put(url, file.buffer, {
        headers: {
          AccessKey: this.apiKey,
          'Content-Type': 'application/octet-stream',
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });
      // Return CDN URL for public access
      // Remove the storage zone prefix from the path if present
      let relativePath = path;
      if (relativePath.startsWith(`${this.storageZone}/`)) {
        relativePath = relativePath.substring(this.storageZone.length + 1);
      }
      const publicUrl = `${this.cdnBase}/${relativePath}`;
      return {
        url: publicUrl,
        provider_id: path,
      };
    } catch (error) {
      throw new InternalServerErrorException('Failed to upload file to Bunny.net Storage.');
    }
  }
}
