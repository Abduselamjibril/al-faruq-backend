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
  @ApiResponse({
    status: 400,
    description: 'No file uploaded or invalid file type.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The video file to upload (e.g., mp4, mkv, mov). Max 5GB.',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadVideo(
    @UploadedFile(
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
  @ApiResponse({
    status: 400,
    description: 'No file uploaded or invalid file type.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The image file to upload (e.g., jpg, png). Max 5MB.',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
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

  @Post('audio')
  @ApiOperation({ summary: 'Upload an audio file' })
  @ApiResponse({
    status: 201,
    description: 'Audio uploaded successfully. Returns the cloud URL.',
  })
  @ApiResponse({
    status: 400,
    description: 'No file uploaded or invalid file type.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The audio file to upload (e.g., mp3, m4a, ogg). Max 100MB.',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAudio(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 100 * 1024 * 1024 }), // 100MB
          new FileTypeValidator({ fileType: 'audio/*' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.uploadService.uploadFile(file, 'audio');
    return {
      message: 'Audio uploaded successfully to cloud',
      url: result.url,
      provider_id: result.provider_id,
    };
  }
  
  // --- [NEW] PDF UPLOAD ENDPOINT ---
  @Post('pdf')
  @ApiOperation({ summary: 'Upload a PDF file for a book' })
  @ApiResponse({
    status: 201,
    description: 'PDF uploaded successfully. Returns the cloud URL.',
  })
  @ApiResponse({
    status: 400,
    description: 'No file uploaded or invalid file type.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'The PDF file to upload. Max 50MB.',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadPdf(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 50 * 1024 * 1024 }), // 50MB
          new FileTypeValidator({ fileType: 'application/pdf' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    const result = await this.uploadService.uploadFile(file, 'pdf');
    return {
      message: 'PDF uploaded successfully to cloud',
      url: result.url,
      provider_id: result.provider_id,
    };
  }
  // --- [END OF NEW] ---
}