// src/auth/guards/roles.guard.ts

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '../../roles/entities/role.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles) {
      // If a route is protected by this guard but has no @Roles decorator,
      // it's better to return true and let the PermissionsGuard handle granular access.
      return true;
    }

    const { user } = context.switchToHttp().getRequest();

    // The user object might not exist or might not have roles.
    if (!user || !user.roles) {
      return false;
    }

    // Check if the user's roles array has at least one of the required roles.
    const hasRequiredRole = requiredRoles.some((role) => user.roles.includes(role));

    if (user.roles.includes(RoleName.GUEST) && !requiredRoles.includes(RoleName.GUEST)) {
        throw new ForbiddenException('User is in guest role and should register');
    }

    return hasRequiredRole;
  }
}