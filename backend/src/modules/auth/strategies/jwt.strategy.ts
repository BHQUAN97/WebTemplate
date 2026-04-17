import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ICurrentUser } from '../../../common/interfaces/index.js';

/**
 * JWT Passport strategy — extract token tu Bearer header, verify, tra ve ICurrentUser.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const accessSecret = configService.get<string>('jwt.accessSecret');
    if (!accessSecret) {
      throw new Error('[JwtStrategy] jwt.accessSecret is not configured');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: accessSecret,
    });
  }

  /**
   * Payload da verified — map sang ICurrentUser attach vao request.user
   */
  async validate(payload: any): Promise<ICurrentUser> {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      tenantId: payload.tenantId,
    };
  }
}
