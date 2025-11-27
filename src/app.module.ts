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
import { SeedModule } from './database/seed.module';
import { FirebaseModule } from './firebase/firebase.module';
import { DevicesModule } from './devices/devices.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ScheduleModule } from '@nestjs/schedule';
import { RemindersModule } from './reminders/reminders.module';
import { SearchModule } from './search/search.module'; // <-- 1. IMPORT SearchModule

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),

    CacheModule.register({
      isGlobal: true,
      ttl: 3600 * 1000,
    }),

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    TypeOrmModule.forRoot(dataSourceOptions),

    // Application Modules
    AuthModule,
    ContentModule,
    DevicesModule,
    FeedModule,
    FirebaseModule,
    MailModule,
    NotificationsModule,
    PurchaseModule,
    RemindersModule,
    SearchModule, // <-- 2. ADD SearchModule
    SeedModule,
    UploadModule,
    UsersModule,
    YoutubeModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}