// src/admin/admin.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Role, Permission])],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}