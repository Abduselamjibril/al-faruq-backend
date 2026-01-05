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

    // 2. If no user is attached, something is wrong, but let other guards handle it.
    // This guard should run AFTER the JwtAuthGuard.
    if (!user) {
      return true;
    }

    // 3. Admins are exempt from the policy check
    if (user.role === RoleName.ADMIN) {
      return true;
    }

    // 4. Check if the user needs to accept a policy
    const isAcceptanceRequired =
      await this.privacyPolicyService.checkIfAcceptanceIsRequired(user.id);

    if (isAcceptanceRequired) {
      // 5. If required, block the request
      throw new ForbiddenException({
        statusCode: 403,
        message: 'You must accept the latest privacy policy to continue.',
        error: 'Policy Acceptance Required',
        // We can add the policy details here if needed by the client
      });
    }

    // 6. If not required, allow the request
    return true;
  }
}