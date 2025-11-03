// src/devices/devices.controller.ts

import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  Delete,
} from '@nestjs/common';
import { DevicesService } from './devices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator'; // Assuming you will move GetUser here
import { User } from '../users/entities/user.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Devices (User)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @ApiOperation({ summary: 'Register a device for push notifications' })
  @ApiResponse({
    status: 201,
    description: 'Device successfully registered.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  registerDevice(
    @GetUser() user: User,
    @Body() registerDeviceDto: RegisterDeviceDto,
  ) {
    return this.devicesService.registerDevice(registerDeviceDto.fcmToken, user);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unregister a device from push notifications (on logout)' })
  @ApiResponse({
    status: 204,
    description: 'Device successfully unregistered.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  deleteDevice(
    @GetUser() user: User,
    @Body() registerDeviceDto: RegisterDeviceDto,
  ) {
    return this.devicesService.deleteDevice(registerDeviceDto.fcmToken, user.id);
  }
}