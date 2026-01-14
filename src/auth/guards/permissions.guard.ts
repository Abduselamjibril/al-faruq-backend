// src/auth/guards/permissions.guard.ts

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If a route has no @Permissions decorator, we allow access.
    // Other guards like JwtAuthGuard should handle basic authentication.
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // If there is no user or user has no permissions, deny access.
    if (!user || !user.permissions) {
      throw new ForbiddenException('You do not have the required permissions to access this resource.');
    }
    
    // Check if the user's permissions array includes every required permission.
    const hasAllPermissions = requiredPermissions.every((permission) =>
      user.permissions.includes(permission),
    );

    if (hasAllPermissions) {
      return true;
    }

    throw new ForbiddenException('You do not have the required permissions to access this resource.');
  }
}