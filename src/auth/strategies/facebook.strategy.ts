// src/auth/strategies/facebook.strategy.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy } from 'passport-facebook';
import { ConfigService } from '@nestjs/config';
import { AuthService, SocialProfile } from '../auth.service';

@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const facebookAppId = configService.get<string>('FACEBOOK_APP_ID');
    const facebookAppSecret = configService.get<string>('FACEBOOK_APP_SECRET');

    if (!facebookAppId || !facebookAppSecret) {
      throw new Error('Facebook OAuth credentials are not configured.');
    }

    super({
      clientID: facebookAppId,
      clientSecret: facebookAppSecret,
      callbackURL: 'http://localhost:3000/api/auth/facebook/callback',
      scope: 'email',
      profileFields: ['id', 'emails', 'name'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
    done: (err: any, user: any, info?: any) => void,
  ): Promise<any> {
    const { name, emails, id } = profile;

    // --- START OF FIX ---
    if (!emails || emails.length === 0) {
      // Facebook does not guarantee an email will be provided.
      // We must handle this case.
      return done(
        new UnauthorizedException('Facebook did not provide an email address.'),
        false,
      );
    }

    const userProfile: SocialProfile = {
      provider: 'facebook',
      providerId: id,
      email: emails[0].value,
      // Provide fallback values in case name is not provided
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
    };
    // --- END OF FIX ---

    const user = await this.authService.validateSocialLogin(userProfile);

    done(null, user);
  }
}