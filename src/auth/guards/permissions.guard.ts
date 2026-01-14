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

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    if (!user || !user.permissions) {
      throw new ForbiddenException('You do not have the required permissions to access this resource.');
    }
    
    // Check if the user's permissions array includes AT LEAST ONE of the required permissions.
    const hasRequiredPermission = requiredPermissions.some((permission) =>
      user.permissions.includes(permission),
    );

    if (hasRequiredPermission) {
      return true;
    }

    throw new ForbiddenException('You do not have the required permissions to access this resource.');
  }
}