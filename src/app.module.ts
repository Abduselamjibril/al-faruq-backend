// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { MailModule } from './mail/mail.module';
import { ContentModule } from './content/content.module';
import { PurchaseModule } from './purchase/purchase.module';
import { FeedModule } from './feed/feed.module';
import { UploadModule } from './upload/upload.module';
import { dataSourceOptions } from './data-source';
import { YoutubeModule } from './youtube/youtube.module';
import { CacheModule } from '@nestjs/cache-manager';
import { SeedModule } from './database/seed.module'; // <-- 1. IMPORT SeedModule

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    CacheModule.register({
      isGlobal: true, // Makes the cache manager available application-wide
      ttl: 3600 * 1000, // Time-to-live for cache entries in milliseconds. 3600 seconds = 1 hour
    }),

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    TypeOrmModule.forRoot(dataSourceOptions),

    UsersModule,
    AuthModule,
    MailModule,
    ContentModule,
    PurchaseModule,
    FeedModule,
    UploadModule,
    YoutubeModule,
    SeedModule, // <-- 2. ADD SeedModule TO IMPORTS
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}