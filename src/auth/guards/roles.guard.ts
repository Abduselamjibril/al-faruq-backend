// src/auth/guards/roles.guard.ts

import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '../../roles/entities/role.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'; // --- [NEW] IMPORT ---

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // --- [NEW] LOGIC TO BYPASS GUARD FOR PUBLIC ROUTES ---
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      // If the route is marked as public, allow access immediately.
      return true;
    }
    // --- [END OF NEW] ---

    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // If a route is protected by this guard but has no @Roles decorator,
    // we DENY access by default for security (principle of least privilege).
    if (!requiredRoles) {
      return false;
    }

    const { user } = context.switchToHttp().getRequest();

    // The user object might not exist if the JwtAuthGuard hasn't run yet
    // or if the token is invalid. Also check if the user has a role.
    if (!user || !user.role) {
      return false;
    }

    // If user is GUEST and not allowed, throw a specific error
    if (user.role === RoleName.GUEST && !requiredRoles.includes(RoleName.GUEST)) {
      throw new ForbiddenException('User is in guest role and should register');
    }
    // Check if the user's role is included in the list of required roles.
    return requiredRoles.some((role) => user.role === role);
  }
}