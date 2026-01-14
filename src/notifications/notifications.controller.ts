// src/notifications/notifications.controller.ts

import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  HttpCode,
  HttpStatus,
  Delete,
  Param,
  ParseIntPipe,
  Req,
  Query,
} from '@nestjs/common';
import type { Request } from 'express';
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
import { PaginationQueryDto } from '../utils/pagination-query.dto';
import { PaginationResponseDto } from '../utils/pagination.dto';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../database/seed.service';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // User-facing endpoints remain accessible to users and admins via RolesGuard
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER, RoleName.ADMIN)
  @ApiOperation({ summary: 'Get a paginated list of visible notifications for current user' })
  @ApiResponse({ status: 200, description: "Returns a paginated list of the user's notifications.", type: PaginationResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAllForUser(
    @Req() req: Request,
    @Query() paginationQuery: PaginationQueryDto,
  ) {
    const userId = (req.user as any).id;
    return this.notificationsService.getNotificationsForUser(
      userId,
      paginationQuery,
    );
  }

  @Post(':id/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER, RoleName.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark a notification as read for the user' })
  @ApiResponse({ status: 204, description: 'Notification successfully marked as read.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  markAsRead(
    @Req() req: Request,
    @Param('id', ParseIntPipe) notificationId: number,
  ) {
    const userId = (req.user as any).id;
    return this.notificationsService.markNotificationAsRead(
      userId,
      notificationId,
    );
  }

  @Post(':id/clear')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER, RoleName.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear (hide) a notification for the user' })
  @ApiResponse({ status: 204, description: 'Notification successfully cleared.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  clearNotification(
    @Req() req: Request,
    @Param('id', ParseIntPipe) notificationId: number,
  ) {
    const userId = (req.user as any).id;
    return this.notificationsService.clearNotificationForUser(
      userId,
      notificationId,
    );
  }

  @Post('clear-all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER, RoleName.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Clear (hide) all notifications for the user' })
  @ApiResponse({ status: 204, description: 'All notifications successfully cleared.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  clearAll(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.notificationsService.clearAllNotificationsForUser(userId);
  }

  // Admin-only endpoints now use PermissionsGuard
  @Post('broadcast')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a broadcast notification to all users (Admin Only)' })
  @ApiResponse({ status: 202, description: 'The broadcast request has been accepted and is being processed.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @ApiOperation({ summary: 'Get the history of all sent broadcast notifications (Admin Only)' })
  @ApiResponse({ status: 200, description: 'Returns a list of past notifications.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  getHistory() {
    return this.notificationsService.getHistory();
  }

  @Delete('history/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.SETTINGS_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a notification from the history (Admin Only)' })
  @ApiResponse({ status: 204, description: 'Notification history item successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Notification with the specified ID not found.' })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  deleteNotification(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.deleteNotification(id);
  }
}