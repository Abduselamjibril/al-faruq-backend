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
    // --- 1. READ the callback URL from environment variables ---
    const facebookCallbackUrl = configService.get<string>(
      'FACEBOOK_CALLBACK_URL',
    );

    // --- 2. UPDATE the validation to include the new variable ---
    if (!facebookAppId || !facebookAppSecret || !facebookCallbackUrl) {
      throw new Error('Facebook OAuth credentials are not configured.');
    }

    super({
      clientID: facebookAppId,
      clientSecret: facebookAppSecret,
      // --- 3. USE the dynamic variable instead of the hardcoded string ---
      callbackURL: facebookCallbackUrl,
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

    if (!emails || emails.length === 0) {
      return done(
        new UnauthorizedException('Facebook did not provide an email address.'),
        false,
      );
    }

    const userProfile: SocialProfile = {
      provider: 'facebook',
      providerId: id,
      email: emails[0].value,
      firstName: name?.givenName || '',
      lastName: name?.familyName || '',
    };

    const user = await this.authService.validateSocialLogin(userProfile);

    done(null, user);
  }
}