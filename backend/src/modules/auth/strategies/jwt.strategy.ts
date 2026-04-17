import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ICurrentUser } from '../../../common/interfaces/index.js';
import { User } from '../../users/entities/user.entity.js';

/**
 * JWT Passport strategy — extract token tu Bearer header, verify, tra ve ICurrentUser.
 *
 * Sau khi verify JWT signature, PHAI fetch user tu DB de:
 *  - Reject user bi soft-delete (deleted_at != null)
 *  - Reject user bi disable (is_active = false)
 *  - Pick up role moi nhat neu admin doi role
 *
 * Neu can toi uu thi cache user theo token JTI qua Redis (TTL = access token TTL).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {
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
   * Payload da verified — fetch user tu DB, check active/deleted, attach vao req.user.
   */
  async validate(payload: any): Promise<ICurrentUser> {
    const user = await this.userRepo.findOne({
      where: { id: payload.sub },
    });

    // Reject: user khong ton tai, bi soft-delete, hoac disabled
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    if (user.deleted_at !== null) {
      throw new UnauthorizedException('Account has been removed');
    }
    if (!user.is_active) {
      throw new UnauthorizedException('Account is disabled');
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      tenantId: user.tenant_id || undefined,
    };
  }
}
