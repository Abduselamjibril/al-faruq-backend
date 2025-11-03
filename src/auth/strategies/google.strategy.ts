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
    // --- START OF FIX ---
    const googleClientId = configService.get<string>('GOOGLE_CLIENT_ID');
    const googleClientSecret = configService.get<string>('GOOGLE_CLIENT_SECRET');

    if (!googleClientId || !googleClientSecret) {
      throw new Error('Google OAuth credentials are not configured.');
    }
    // --- END OF FIX ---

    super({
      clientID: googleClientId, // Use the validated variable
      clientSecret: googleClientSecret, // Use the validated variable
      callbackURL: 'http://localhost:3000/api/auth/google/callback',
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