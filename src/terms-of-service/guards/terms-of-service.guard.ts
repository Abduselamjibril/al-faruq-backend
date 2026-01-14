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
    // Check for the @SkipTosCheck() decorator on the handler or class.
    const skipTosCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_TOS_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipTosCheck) {
      return true; // Skip the check entirely.
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // If there's no user, another guard (like JwtAuthGuard) should handle it.
    // This guard only applies to authenticated users.
    if (!user) {
      return true;
    }

    // Is there a mandatory ToS to check against?
    const mandatoryTos = await this.tosService.findActiveMandatory();
    if (!mandatoryTos) {
      return true; // No mandatory ToS, so access is granted.
    }

    // Has this user accepted this specific mandatory ToS?
    const hasAccepted = await this.tosService.hasUserAccepted(
      user.id,
      mandatoryTos.id,
    );
    if (hasAccepted) {
      return true; // User has accepted, access is granted.
    }

    // If we reach here, the user has NOT accepted. Block access.
    throw new ForbiddenException({
      message: 'You must accept the latest Terms of Service to continue.',
      errorCode: 'TOS_NOT_ACCEPTED',
    });
  }
}