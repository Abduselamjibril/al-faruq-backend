// src/permissions/permissions.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Permission])],
  exports: [TypeOrmModule], // Export so other modules can use the Permission repository
})
export class PermissionsModule {}