import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';

import {
  Strategy,
  StrategyOptions,
  VerifyCallback,
} from 'passport-google-oauth20';
import { AuthService } from '../auth.service.js';

/**
 * Google OAuth2 strategy — nhan profile tu Google sau khi user approve consent.
 * Strategy chi duoc khoi tao voi credentials tu config; nhung module chi dang
 * ky provider nay khi `oauth.google.enabled=true` de tranh crash khi khong co env.
 */
@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  private readonly logger = new Logger('GoogleStrategy');

  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID =
      configService.get<string>('oauth.google.clientId') || 'dummy';
    const clientSecret =
      configService.get<string>('oauth.google.clientSecret') || 'dummy';
    const callbackURL =
      configService.get<string>('oauth.google.callbackUrl') ||
      'http://localhost:6001/api/auth/google/callback';

    const options: StrategyOptions = {
      clientID,
      clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    };
    super(options);
  }

  /**
   * Map Google profile -> internal user qua AuthService.validateOAuthUser.
   */
  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: VerifyCallback,
  ): Promise<void> {
    try {
      const email =
        profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (!email) {
        return done(new Error('Google account khong tra ve email'), false);
      }
      const user = await this.authService.validateOAuthUser({
        provider: 'google',
        providerId: profile.id,
        email,
        name: profile.displayName || email.split('@')[0],
        avatar:
          profile.photos && profile.photos[0] ? profile.photos[0].value : null,
      });
      done(null, user);
    } catch (err) {
      this.logger.error(
        `Google OAuth validate failed: ${(err as Error).message}`,
      );
      done(err as Error, false);
    }
  }
}
