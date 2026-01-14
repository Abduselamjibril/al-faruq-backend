// src/admin/admin.controller.ts

import { Controller, Get, Post, Body, Param, ParseIntPipe, UseGuards, Patch, ParseUUIDPipe } from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../database/seed.service';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { CreateRoleDto } from './dto/create-role.dto';
import { AssignPermissionsToRoleDto } from './dto/assign-permissions-to-role.dto';
import { AssignRolesToUserDto } from './dto/assign-roles-to-user.dto';

@ApiTags('Admin Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post('roles')
  @Permissions(PERMISSIONS.ROLE_MANAGE)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created successfully.'})
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.'})
  createRole(@Body() createRoleDto: CreateRoleDto) {
    return this.adminService.createRole(createRoleDto);
  }

  @Get('roles')
  @Permissions(PERMISSIONS.ROLE_MANAGE)
  @ApiOperation({ summary: 'Get all roles and their permissions' })
  @ApiResponse({ status: 200, description: 'List of all roles.'})
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.'})
  findAllRoles() {
    return this.adminService.findAllRoles();
  }

  @Patch('roles/:id/permissions')
  @Permissions(PERMISSIONS.ROLE_MANAGE)
  @ApiOperation({ summary: 'Assign permissions to a role' })
  @ApiResponse({ status: 200, description: 'Permissions assigned successfully.'})
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.'})
  assignPermissionsToRole(
    @Param('id', ParseIntPipe) id: number,
    @Body() assignPermissionsDto: AssignPermissionsToRoleDto,
  ) {
    return this.adminService.assignPermissionsToRole(id, assignPermissionsDto.permissionIds);
  }

  @Get('permissions')
  @Permissions(PERMISSIONS.ROLE_MANAGE)
  @ApiOperation({ summary: 'Get all available permissions' })
  @ApiResponse({ status: 200, description: 'List of all permissions.'})
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.'})
  findAllPermissions() {
    return this.adminService.findAllPermissions();
  }

  @Patch('users/:id/roles')
  @Permissions(PERMISSIONS.ROLE_MANAGE)
  @ApiOperation({ summary: 'Assign roles to a user' })
  @ApiResponse({ status: 200, description: 'Roles assigned successfully.'})
  @ApiResponse({ status: 403, description: 'Forbidden. Missing permissions.'})
  assignRolesToUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() assignRolesDto: AssignRolesToUserDto,
  ) {
    return this.adminService.assignRolesToUser(id, assignRolesDto.roleIds);
  }
}