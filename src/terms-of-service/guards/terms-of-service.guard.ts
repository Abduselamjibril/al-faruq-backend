import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TermsOfServiceService } from '../terms-of-service.service';
import { SKIP_TOS_CHECK_KEY } from '../decorators/skip-tos-check.decorator';

@Injectable()
export class TermsOfServiceGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tosService: TermsOfServiceService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const skipTosCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_TOS_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipTosCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // This guard only applies to authenticated users.
    // If there's no user, let it pass; JwtAuthGuard will handle it.
    if (!user) {
      return true;
    }

      // Only enforce ToS acceptance for USER role; other roles bypass
      if (!user.roles?.includes(RoleName.USER)) {
        return true;
      }

      // Is there a mandatory ToS to check against?
      const mandatoryTos = await this.tosService.findActiveMandatory();
      if (!mandatoryTos) {
        return true; // No mandatory ToS exists, so all users are compliant.
      }

      // Has this user accepted this specific mandatory ToS?
      const hasAccepted = await this.tosService.hasUserAccepted(
        user.id,
        mandatoryTos.id,
      );
      if (hasAccepted) {
        return true; // User has accepted, allow the request.
      }

      // If we reach here, the user has not accepted. Block access.
      throw new ForbiddenException({
        message: 'You must accept the latest Terms of Service to continue.',
        errorCode: 'TOS_NOT_ACCEPTED',
      });
  }
}