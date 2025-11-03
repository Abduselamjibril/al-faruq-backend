// src/notifications/notifications.controller.ts

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Delete, // <-- 1. Import decorators for DELETE
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { RoleName } from '../roles/entities/role.entity';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('Notifications (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('broadcast')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a broadcast notification to all users' })
  @ApiResponse({
    status: 202,
    description:
      'The broadcast request has been accepted and is being processed.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User is not an admin.' })
  async sendBroadcast(@Body() createNotificationDto: CreateNotificationDto) {
    this.notificationsService.sendBroadcastNotification(
      createNotificationDto.title,
      createNotificationDto.message,
    );
    return {
      message: 'Broadcast notification process has been initiated.',
    };
  }

  @Get('history')
  @ApiOperation({ summary: 'Get the history of all sent broadcast notifications' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of past notifications.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User is not an admin.' })
  getHistory() {
    return this.notificationsService.getHistory();
  }

  // --- NEW DELETE ENDPOINT ---
  @Delete('history/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification from the history' })
  @ApiResponse({
    status: 204,
    description: 'Notification history item successfully deleted.',
  })
  @ApiResponse({ status: 404, description: 'Notification with the specified ID not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User is not an admin.' })
  deleteNotification(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.deleteNotification(id);
  }
}