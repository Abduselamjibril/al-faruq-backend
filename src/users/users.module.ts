// src/users/users.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { RolesModule } from '../roles/roles.module'; // <-- 1. IMPORT RolesModule

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    RolesModule, // <-- 2. ADD RolesModule here
  ],
  providers: [UsersService],
  exports: [UsersService], // Export UsersService so other modules can use it
})
export class UsersModule {}