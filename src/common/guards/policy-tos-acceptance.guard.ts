import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { PrivacyPolicyService } from '../../privacy-policy/privacy-policy.service';
import { TermsOfServiceService } from '../../terms-of-service/terms-of-service.service';

@Injectable()
export class PolicyTosAcceptanceGuard implements CanActivate {
  constructor(
    private readonly privacyPolicyService: PrivacyPolicyService,
    private readonly termsOfServiceService: TermsOfServiceService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    // If no user, skip (let AuthGuard handle it)
    if (!user) return true;

    // Optionally allow skipping for certain endpoints (e.g., login/register)
    const skipCheck = this.reflector.get<boolean>('skipPolicyTosCheck', context.getHandler());
    if (skipCheck) return true;

    // Check Privacy Policy acceptance
    const hasAcceptedPrivacy = await this.privacyPolicyService.hasAcceptedLatest(user.id);
    // Check Terms of Service acceptance
    const hasAcceptedTos = await this.termsOfServiceService.hasAcceptedLatest(user.id);

    if (!hasAcceptedPrivacy || !hasAcceptedTos) {
      throw new ForbiddenException('Forbidden: please accept the privacy policy and terms of service');
    }
    return true;
  }
}
