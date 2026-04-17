import { NestFactory, Reflector } from '@nestjs/core';
import { ClassSerializerInterceptor, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 6001;
  const appName = configService.get<string>('app.name') || 'WebTemplate';
  const appUrl = configService.get<string>('app.url') || 'http://localhost:6000';
  const env = configService.get<string>('app.env') || 'development';
  const logger = new Logger('Bootstrap');

  // Security headers — cho phep iframe tu cung domain
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: env === 'production' ? undefined : false,
  }));

  // Parse cookies (cho refresh token)
  app.use(cookieParser());

  // CORS — cho phep frontend truy cap
  // Ho tro nhieu domain tu CORS_ORIGINS env (comma-separated)
  const corsOrigins = configService.get<string>('CORS_ORIGINS');
  const allowedOrigins = corsOrigins
    ? corsOrigins.split(',').map((o: string) => o.trim())
    : [appUrl, 'http://localhost:6000', 'http://localhost:3000'];

  app.enableCors({
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Cho phep requests khong co origin (mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      // Cho phep wildcard subdomain nhu *.yourdomain.com
      const wildcardMatch = allowedOrigins.some((allowed: string) => {
        if (allowed.startsWith('*.')) {
          const domain = allowed.slice(2);
          return origin.endsWith(domain);
        }
        return false;
      });
      if (wildcardMatch) return callback(null, true);
      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-API-Key'],
    exposedHeaders: ['X-Total-Count', 'X-Request-Id'],
    maxAge: 86400, // Preflight cache 24h
  });

  // Global serializer — ap dung @Exclude() tu class-transformer de loai bo
  // sensitive fields (password_hash, two_factor_secret, ...) khoi response.
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // API prefix
  app.setGlobalPrefix('api');

  // Trust proxy khi chay sau Nginx
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);

  await app.listen(port, '0.0.0.0');
  logger.log(`${appName} API running on http://0.0.0.0:${port}`);
  logger.log(`Environment: ${env}`);
  logger.log(`CORS origins: ${allowedOrigins.join(', ')}`);
}

bootstrap();
