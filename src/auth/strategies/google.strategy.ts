// src/auth/strategies/google.strategy.ts

import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-google-oauth20';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AuthService, SocialProfile } from '../auth.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const googleClientId = configService.get<string>('GOOGLE_CLIENT_ID');
    const googleClientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');
    // --- 1. READ the callback URL from environment variables ---
    const googleCallbackUrl = configService.get<string>('GOOGLE_CALLBACK_URL');

    // --- 2. UPDATE the validation to include the new variable ---
    if (!googleClientId || !googleClientSecret || !googleCallbackUrl) {
      throw new Error('Google OAuth credentials are not configured.');
    }

    super({
      clientID: googleClientId,
      clientSecret: googleClientSecret,
      // --- 3. USE the dynamic variable instead of the hardcoded string ---
      callbackURL: googleCallbackUrl,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<any> {
    const { name, emails, id } = profile;

    const userProfile: SocialProfile = {
      provider: 'google',
      providerId: id,
      email: emails[0].value,
      firstName: name.givenName,
      lastName: name.familyName,
    };

    const user = await this.authService.validateSocialLogin(userProfile);

    done(null, user);
  }
}