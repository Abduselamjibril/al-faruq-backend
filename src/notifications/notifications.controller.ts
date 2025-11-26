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

// --- UPDATED ApiTags to cover both Admin and User roles ---
@ApiTags('Notifications (Admin)', 'Notifications (User)')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  // --- NEW ENDPOINT FOR REGULAR USERS ---
  @Get()
  @UseGuards(JwtAuthGuard) // Protected by JWT, but NOT RolesGuard
  @ApiOperation({ summary: 'Get notification history for the current user' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all broadcast notifications sent.',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized.' })
  findAllForUser() {
    // This endpoint is for users, so it reuses the getHistory logic.
    // In a more complex app, you might have user-specific notifications.
    return this.notificationsService.getHistory();
  }
  // --- END OF NEW ENDPOINT ---

  // --- ADMIN-ONLY ENDPOINTS ARE BELOW ---

  @Post('broadcast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Send a broadcast notification to all users (Admin Only)' })
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
  @ApiOperation({ summary: 'Get the history of all sent broadcast notifications (Admin Only)' })
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
  @ApiOperation({ summary: 'Delete a notification from the history (Admin Only)' })
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