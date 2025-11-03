// src/upload/upload.controller.ts

import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  UseGuards,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Express } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/entities/role.entity';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { UploadService } from './upload.service';

@ApiTags('Upload (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('video')
  @ApiOperation({ summary: 'Upload a video file' })
  @ApiResponse({
    status: 201,
    description: 'Video uploaded successfully. Returns the cloud URL.',
  })
  @ApiResponse({ status: 400, description: 'No file uploaded or invalid file type.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        video: {
          type: 'string',
          format: 'binary',
          description: 'The video file to upload (e.g., mp4, mkv, mov). Max 5GB.',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('video'))
  async uploadVideo(
    @UploadedFile(
      // Use built-in NestJS pipes for validation instead of multer options for better error handling and Swagger integration
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 * 1024 }), // 5GB
          new FileTypeValidator({ fileType: 'video/*' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.uploadService.uploadFile(file, 'video');
    return {
      message: 'Video uploaded successfully to cloud',
      url: result.url,
      provider_id: result.provider_id,
    };
  }

  @Post('thumbnail')
  @ApiOperation({ summary: 'Upload a thumbnail image' })
  @ApiResponse({
    status: 201,
    description: 'Thumbnail uploaded successfully. Returns the cloud URL.',
  })
  @ApiResponse({ status: 400, description: 'No file uploaded or invalid file type.' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        thumbnail: {
          type: 'string',
          format: 'binary',
          description: 'The image file to upload (e.g., jpg, png). Max 5MB.',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('thumbnail'))
  async uploadThumbnail(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: 'image/*' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.uploadService.uploadFile(file, 'thumbnail');
    return {
      message: 'Thumbnail uploaded successfully to cloud',
      url: result.url,
      provider_id: result.provider_id,
    };
  }
}