import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RoleName } from '../../roles/entities/role.entity';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RoleName[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // --- THIS IS THE CRITICAL CHANGE ---
    // If a route is protected by this guard but has no @Roles decorator,
    // we DENY access by default for security (principle of least privilege).
    if (!requiredRoles) {
      return false;
    }
    // --- END OF CHANGE ---

    const { user } = context.switchToHttp().getRequest();

    // The user object might not exist if the JwtAuthGuard hasn't run yet
    // or if the token is invalid. Also check if the user has a role.
    if (!user || !user.role) {
      return false;
    }

    // Check if the user's role is included in the list of required roles.
    // This logic remains the same and works perfectly.
    return requiredRoles.some((role) => user.role === role);
  }
}