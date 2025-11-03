// src/notifications/notifications.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from './entities/notification.entity';
import { DevicesModule } from '../devices/devices.module';
import { NotificationsController } from './notifications.controller'; // <-- 1. Import the controller

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification]),
    DevicesModule,
  ],
  controllers: [NotificationsController], // <-- 2. Add the controller to the module
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}