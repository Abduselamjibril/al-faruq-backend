// src/privacy-policy/guards/policy-acceptance.guard.ts

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../../auth/decorators/public.decorator';
import { RoleName } from '../../roles/entities/role.entity';
import { PrivacyPolicyService } from '../privacy-policy.service';

@Injectable()
export class PolicyAcceptanceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly privacyPolicyService: PrivacyPolicyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // 1. Don't apply to public routes
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 2. If no user is attached, let other guards handle it.
      if (!user || !user.roles) {
        return true;
      }

      // Only apply policy acceptance check to users with the USER role
      if (user.roles.includes(RoleName.USER)) {
        const isAcceptanceRequired =
          await this.privacyPolicyService.checkIfAcceptanceIsRequired(user.id);

        if (isAcceptanceRequired) {
          throw new ForbiddenException({
            statusCode: 403,
            message: 'You must accept the latest privacy policy to continue.',
            error: 'Policy Acceptance Required',
          });
        }
      }

      // All other roles bypass the policy acceptance check
      return true;
  }
}