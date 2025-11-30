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
  Query, // <-- 1. Import Query
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
import { PaginationQueryDto } from '../utils/pagination-query.dto'; // <-- 2. Import DTOs
import { PaginationResponseDto } from '../utils/pagination.dto';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // ================================================================= //
  //                       USER-FACING ENDPOINTS                       //
  // ================================================================= //

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.USER, RoleName.ADMIN)
  @ApiOperation({
    summary: 'Get a paginated list of visible notifications for current user',
  })
  @ApiResponse({
    status: 200,
    description: "Returns a paginated list of the user's notifications.",
    type: PaginationResponseDto, // <-- 3. Update Swagger response type
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAllForUser(
    @Req() req: Request,
    @Query() paginationQuery: PaginationQueryDto, // <-- 4. Accept pagination query params
  ) {
    const userId = (req.user as any).id;
    // --- 5. Pass pagination params to the service ---
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
  @ApiResponse({
    status: 204,
    description: 'Notification successfully marked as read.',
  })
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
  @ApiResponse({
    status: 204,
    description: 'Notification successfully cleared.',
  })
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
  @ApiResponse({
    status: 204,
    description: 'All notifications successfully cleared.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  clearAll(@Req() req: Request) {
    const userId = (req.user as any).id;
    return this.notificationsService.clearAllNotificationsForUser(userId);
  }

  // ================================================================= //
  //                        ADMIN-ONLY ENDPOINTS                       //
  // ================================================================= //

  @Post('broadcast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Send a broadcast notification to all users (Admin Only)',
  })
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
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiOperation({
    summary: 'Get the history of all sent broadcast notifications (Admin Only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of past notifications.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User is not an admin.' })
  getHistory() {
    return this.notificationsService.getHistory();
  }

  @Delete('history/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a notification from the history (Admin Only)',
  })
  @ApiResponse({
    status: 204,
    description: 'Notification history item successfully deleted.',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification with the specified ID not found.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  @ApiResponse({ status: 403, description: 'Forbidden. User is not an admin.' })
  deleteNotification(@Param('id', ParseIntPipe) id: number) {
    return this.notificationsService.deleteNotification(id);
  }
}