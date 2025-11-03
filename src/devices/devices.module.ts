// src/devices/devices.module.ts

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DevicesService } from './devices.service';
import { Device } from './entities/device.entity';
import { DevicesController } from './devices.controller'; // <-- 1. Import the controller

@Module({
  imports: [TypeOrmModule.forFeature([Device])],
  controllers: [DevicesController], // <-- 2. Add the controller to the module
  providers: [DevicesService],
  exports: [DevicesService],
})
export class DevicesModule {}