import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { RolesModule } from '../roles/roles.module';
import { UsersController } from './users.controller'; // --- 1. IMPORT THE NEW CONTROLLER ---

@Module({
  imports: [
    TypeOrmModule.forFeature([User]),
    RolesModule,
  ],
  controllers: [UsersController], // --- 2. ADD THE CONTROLLER HERE ---
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}