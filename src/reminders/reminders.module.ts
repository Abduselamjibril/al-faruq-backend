// src/reminders/reminders.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RemindersService } from './reminders.service';
import { ReminderSetting } from './entities/reminder-setting.entity';
import { NotificationsModule } from '../notifications/notifications.module';
import { RemindersController } from './reminders.controller'; // <-- 1. Import the controller

@Module({
  imports: [
    TypeOrmModule.forFeature([ReminderSetting]),
    NotificationsModule,
  ],
  controllers: [RemindersController], // <-- 2. Add the controller to the module
  providers: [RemindersService],
})
export class RemindersModule {}