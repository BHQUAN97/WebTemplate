import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, StrategyOptions } from 'passport-facebook';
import { AuthService } from '../auth.service.js';

/**
 * Facebook OAuth strategy — nhan profile tu Facebook Graph API.
 * Chi dang ky khi `oauth.facebook.enabled=true`.
 *
 * Facebook KHONG luon tra email (user co the deny scope). Neu thieu email,
 * tra loi ro rang — front-end hien thong bao yeu cau user cho phep email.
 */
@Injectable()
export class FacebookStrategy extends PassportStrategy(Strategy, 'facebook') {
  private readonly logger = new Logger('FacebookStrategy');

  constructor(
    configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    const clientID =
      configService.get<string>('oauth.facebook.clientId') || 'dummy';
    const clientSecret =
      configService.get<string>('oauth.facebook.clientSecret') || 'dummy';
    const callbackURL =
      configService.get<string>('oauth.facebook.callbackUrl') ||
      'http://localhost:6001/api/auth/facebook/callback';

    const options: StrategyOptions = {
      clientID,
      clientSecret,
      callbackURL,
      profileFields: ['id', 'displayName', 'photos', 'email'],
    };
    super(options);
  }

  /**
   * Map Facebook profile -> internal user.
   */
  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: any,
    done: (err: any, user?: any) => void,
  ): Promise<void> {
    try {
      const email =
        profile.emails && profile.emails[0] ? profile.emails[0].value : null;
      if (!email) {
        return done(
          new Error(
            'Facebook khong tra ve email — hay cho phep quyen email khi login',
          ),
          false,
        );
      }
      const user = await this.authService.validateOAuthUser({
        provider: 'facebook',
        providerId: profile.id,
        email,
        name: profile.displayName || email.split('@')[0],
        avatar:
          profile.photos && profile.photos[0] ? profile.photos[0].value : null,
      });
      done(null, user);
    } catch (err) {
      this.logger.error(
        `Facebook OAuth validate failed: ${(err as Error).message}`,
      );
      done(err as Error, false);
    }
  }
}
