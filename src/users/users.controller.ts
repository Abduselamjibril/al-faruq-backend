// src/users/users.controller.ts

import {
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../database/seed.service';

@ApiTags('User Management (Admin)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@UseInterceptors(ClassSerializerInterceptor)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Permissions(PERMISSIONS.USER_MANAGE)
  @ApiOperation({ summary: 'Get a list of all users (Admin Only)' })
  @ApiResponse({ status: 200, description: 'Returns a list of all users.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  findAll() {
    return this.usersService.findAll();
  }

  @Get('search')
  @Permissions(PERMISSIONS.USER_MANAGE)
  @ApiOperation({ summary: 'Search for users by name, email, or phone number (Admin Only)' })
  @ApiQuery({ name: 'term', required: true, description: 'The search term to look for.' })
  @ApiResponse({ status: 200, description: 'Returns a list of matching users.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  search(@Query('term') term: string) {
    return this.usersService.search(term);
  }

  @Delete(':id')
  @Permissions(PERMISSIONS.USER_MANAGE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user by ID (Admin Only)' })
  @ApiResponse({ status: 204, description: 'User successfully deleted.' })
  @ApiResponse({ status: 404, description: 'User with the specified ID not found.' })
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}