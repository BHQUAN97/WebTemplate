import { Module } from '@nestjs/common';
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
            expiresIn: (config.get<string>('jwt.accessExpires') || '15m') as any,
          },
        };
      },
    }),
    // Register User repo cho TwoFactorService (update two_factor_secret/enabled)
    TypeOrmModule.forFeature([RefreshToken, User]),
    UsersModule,
  ],
  controllers: [AuthController, TwoFactorController],
  providers: [AuthService, JwtStrategy, TwoFactorService],
  exports: [AuthService, TwoFactorService],
})
export class AuthModule {}
