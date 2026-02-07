// src/content/content.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Content } from './entities/content.entity';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { Language } from './entities/language.entity';
import { ContentPricing } from './entities/content-pricing.entity';
import { UsersModule } from '../users/users.module'; // --- [NEW] IMPORT ---
import { NotificationsModule } from '../notifications/notifications.module';
import { UploadModule } from '../upload/upload.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Content, ContentPricing, Language]),
    UsersModule, // --- [NEW] ADD THE MODULE HERE ---
    NotificationsModule,
    UploadModule, // <-- Import UploadModule to provide UploadService
  ],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}