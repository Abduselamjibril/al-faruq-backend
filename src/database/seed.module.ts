// src/database/seed.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from '../roles/entities/role.entity';
import { User } from '../users/entities/user.entity';
import { SeedService } from './seed.service';
import { ReminderSetting } from '../reminders/entities/reminder-setting.entity';
import { Permission } from '../permissions/entities/permission.entity'; // --- [NEW] IMPORT ---

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, ReminderSetting, Permission]), // --- [NEW] ADD PERMISSION ENTITY ---
    ConfigModule,
  ],
  providers: [SeedService],
  exports: [SeedService],
})
export class SeedModule {}