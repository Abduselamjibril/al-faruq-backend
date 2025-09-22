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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    CacheModule.register({
      isGlobal: true, // Makes the cache manager available application-wide
      ttl: 3600 * 1000, // Time-to-live for cache entries in milliseconds. 3600 seconds = 1 hour
    }),
    // --- THIS IS THE FIX ---
    // The path now correctly points to the 'uploads' folder in the project root.
    // process.cwd() gives the root directory where the 'node' command was started.
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    
    // We use our single, consolidated configuration for TypeORM
    TypeOrmModule.forRoot(dataSourceOptions),
    
    UsersModule,
    AuthModule,
    MailModule,
    ContentModule,
    PurchaseModule,
    FeedModule,
    UploadModule,
    YoutubeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}