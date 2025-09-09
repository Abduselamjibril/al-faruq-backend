import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import type { Express } from 'express';

// Helper function to create unique filenames
const generateFilename = (req, file, callback) => {
  const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const extension = extname(file.originalname);
  const filename = `${file.originalname.split('.')[0]}-${uniqueSuffix}${extension}`;
  callback(null, filename);
};

// Helper function for image file filter
const imageFileFilter = (req, file, callback) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
    return callback(new Error('Only image files are allowed!'), false);
  }
  callback(null, true);
};

// Helper function for video file filter
const videoFileFilter = (req, file, callback) => {
  if (!file.mimetype.match(/\/(mp4|x-matroska|quicktime|x-msvideo)$/)) {
    return callback(new Error('Only video files are allowed!'), false);
  }
  callback(null, true);
};


@Controller('upload')
export class UploadController {
  
  @Post('video')
  @UseInterceptors(
    FileInterceptor('video', {
      storage: diskStorage({
        destination: './uploads/videos',
        filename: generateFilename,
      }),
      fileFilter: videoFileFilter,
      limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5GB
    }),
  )
  uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No video file uploaded.');
    }
    const fileUrl = `http://localhost:3000/uploads/videos/${file.filename}`;
    return {
      message: 'Video uploaded successfully',
      url: fileUrl,
    };
  }

  // --- NEW ENDPOINT FOR THUMBNAILS ---
  @Post('thumbnail')
  @UseInterceptors(
    FileInterceptor('thumbnail', { // Expects a form field named 'thumbnail'
      storage: diskStorage({
        destination: './uploads/thumbnails', // Save to the new folder
        filename: generateFilename,
      }),
      fileFilter: imageFileFilter, // Use the image filter
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit for images
    }),
  )
  uploadThumbnail(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No thumbnail file uploaded.');
    }
    const fileUrl = `http://localhost:3000/uploads/thumbnails/${file.filename}`;
    return {
      message: 'Thumbnail uploaded successfully',
      url: fileUrl,
    };
  }
}