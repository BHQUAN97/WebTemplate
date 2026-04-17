import { forwardRef, Module, Provider } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { UsersModule } from '../users/users.module.js';
import { TwoFactorService } from './two-factor.service.js';
import { TwoFactorController } from './two-factor.controller.js';
import { SettingsModule } from '../settings/settings.module.js';
import { GoogleStrategy } from './strategies/google.strategy.js';
import { FacebookStrategy } from './strategies/facebook.strategy.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';

/**
 * Tao list providers — chi register Google/Facebook strategy neu enabled.
 * Kiem tra bang env var truc tiep (chua inject ConfigService duoc trong class factory).
 */
function getOAuthProviders(): Provider[] {
  const providers: Provider[] = [];
  if (process.env.OAUTH_GOOGLE_ENABLED === 'true') {
    providers.push(GoogleStrategy);
  }
  if (process.env.OAUTH_FACEBOOK_ENABLED === 'true') {
    providers.push(FacebookStrategy);
  }
  return providers;
}

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>('jwt.accessSecret');
        if (!secret) {
          throw new Error('[AuthModule] jwt.accessSecret is not configured');
        }
        return {
          secret,
          signOptions: {
            expiresIn: (config.get<string>('jwt.accessExpires') ||
              '15m') as any,
          },
        };
      },
    }),
    // Register User repo cho TwoFactorService + JwtStrategy
    TypeOrmModule.forFeature([RefreshToken, User]),
    // forwardRef UsersModule — tranh circular dep khi UsersService can AuthService
    forwardRef(() => UsersModule),
    // SettingsModule needed for email flags in auth.service
    SettingsModule,
    // AuditLogsModule needed for auth event logging (login, logout, password change, 2FA)
    AuditLogsModule,
  ],
  controllers: [AuthController, TwoFactorController],
  providers: [
    AuthService,
    JwtStrategy,
    TwoFactorService,
    // OAuth strategies chi add khi env bat
    ...getOAuthProviders(),
  ],
  exports: [AuthService, TwoFactorService],
})
export class AuthModule {}
