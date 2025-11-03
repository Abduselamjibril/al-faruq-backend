// src/database/seed.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { SeedService } from './seed.service';
import { ReminderSetting } from '../reminders/entities/reminder-setting.entity'; // <-- 1. IMPORT ReminderSetting

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, ReminderSetting]), // <-- 2. ADD ReminderSetting here
    ConfigModule,
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}