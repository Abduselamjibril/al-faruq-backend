// src/reminders/reminders.controller.ts

import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseEnumPipe,
} from '@nestjs/common';
import { RemindersService } from './reminders.service';
import { UpdateReminderDto } from './dto/update-reminder.dto';
import { ReminderId } from './entities/reminder-setting.entity';
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

@ApiTags('Reminders (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleName.ADMIN)
@Controller('reminders')
export class RemindersController {
  constructor(private readonly remindersService: RemindersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all reminder settings' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of all current reminder settings.',
  })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findAll() {
    return this.remindersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific reminder setting by its ID' })
  @ApiResponse({
    status: 200,
    description: 'Returns the specified reminder setting.',
  })
  @ApiResponse({ status: 404, description: 'Reminder setting not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  findOne(@Param('id', new ParseEnumPipe(ReminderId)) id: ReminderId) {
    return this.remindersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a reminder setting' })
  @ApiResponse({
    status: 200,
    description: 'Reminder setting successfully updated.',
  })
  @ApiResponse({ status: 404, description: 'Reminder setting not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden.' })
  update(
    @Param('id', new ParseEnumPipe(ReminderId)) id: ReminderId,
    @Body() updateReminderDto: UpdateReminderDto,
  ) {
    return this.remindersService.update(id, updateReminderDto);
  }
}