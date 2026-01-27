// src/app.module.ts

import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PolicyTosAcceptanceGuard } from './common/guards/policy-tos-acceptance.guard';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import { SearchModule } from './search/search.module';
import { LanguageModule } from './language/language.module';
import { ReportsModule } from './reports/reports.module';
import { NewsModule } from './news/news.module';
import { QuranModule } from './quran/quran.module';
import { BookmarkModule } from './bookmark/bookmark.module';
import { EntitlementModule } from './entitlement/entitlement.module';
import { PrivacyPolicyModule } from './privacy-policy/privacy-policy.module';
import { AdminModule } from './admin/admin.module';
import { PermissionsModule } from './permissions/permissions.module';
import { TermsOfServiceModule } from './terms-of-service/terms-of-service.module';

import { ThrottlerModule } from '@nestjs/throttler';
import { redisStore } from 'cache-manager-redis-store';

@Module({
  imports: [
    ThrottlerModule.forRoot({
      throttlers: [
        {
          limit: 100, // max requests per ttl per IP
          ttl: 60,    // time to live in seconds
        },
      ],
    }),
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),

    // --- [CORRECTED] THIS IS NOW THE ONLY CACHE MODULE REGISTRATION ---
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const host = configService.get<string>('REDIS_HOST');
        const port = configService.get<number>('REDIS_PORT');
        
        console.log(`[CacheModule] Attempting to connect to Redis at ${host}:${port}`);
        
        return {
          store: await redisStore({
            socket: {
              host: host,
              port: port,
            },
            ttl: 3600, // Default TTL in seconds (1 hour)
          }),
        };
      },
    }),
    // --- [END OF CORRECTION] ---

    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),

    TypeOrmModule.forRoot(dataSourceOptions),

    // Application Modules
    AdminModule,
    AuthModule,
    BookmarkModule,
    ContentModule,
    DevicesModule,
    EntitlementModule,
    FeedModule,
    FirebaseModule,
    LanguageModule,
    MailModule,
    NewsModule,
    NotificationsModule,
    PermissionsModule,
    PrivacyPolicyModule,
    PurchaseModule,
    QuranModule,
    RemindersModule,
    ReportsModule,
    SearchModule,
    SeedModule,
    TermsOfServiceModule,
    UploadModule,
    UsersModule,
    YoutubeModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: PolicyTosAcceptanceGuard,
    },
  ],
})
export class AppModule {}