// src/notifications/notifications.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { DevicesModule } from '../devices/devices.module';
import { NotificationsController } from './notifications.controller';
import { UserNotificationStatus } from './entities/user-notification-status.entity'; // <-- 1. Import the new entity

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, UserNotificationStatus]), // <-- 2. Add the entity here
    DevicesModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}