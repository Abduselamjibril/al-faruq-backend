import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';

@Module({
  controllers: [UploadController],
  // We will provide Multer options in the controller for more flexibility
})
export class UploadModule {}