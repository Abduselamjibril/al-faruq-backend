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
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { RegisterDeviceDto } from './dto/register-device.dto';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/entities/role.entity';

@ApiTags('Devices (User-Facing)')
@ApiBearerAuth()
@Controller('devices')
// --- GUARDS AND ROLES APPLIED AT THE CONTROLLER LEVEL ---
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.USER)
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post()
  @ApiOperation({ summary: 'Register a device for push notifications (User Only)' })
  @ApiResponse({
    status: 201,
    description: 'Device successfully registered.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  registerDevice(
    @GetUser() user: User,
    @Body() registerDeviceDto: RegisterDeviceDto,
  ) {
    return this.devicesService.registerDevice(registerDeviceDto.fcmToken, user);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unregister a device from push notifications (on logout) (User Only)' })
  @ApiResponse({
    status: 204,
    description: 'Device successfully unregistered.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  deleteDevice(
    @GetUser() user: User,
    @Body() registerDeviceDto: RegisterDeviceDto,
  ) {
    return this.devicesService.deleteDevice(registerDeviceDto.fcmToken, user.id);
  }
}