import {
  Injectable,
  NestMiddleware,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { SettingsService } from '../../modules/settings/settings.service.js';

// Cac prefix duoc di qua maintenance mode (health probe, admin login, auth)
const BYPASS_PREFIXES = ['/api/health', '/api/auth/login', '/api/auth/refresh'];

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(private readonly settingsService: SettingsService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    // Admin user-agent bypass (Swagger, internal probes)
    if (BYPASS_PREFIXES.some((p) => req.path.startsWith(p))) {
      return next();
    }

    const raw = await this.settingsService.getValue('maintenance_mode').catch(() => 'false');
    if (raw === 'true' || raw === true) {
      throw new ServiceUnavailableException(
        'He thong dang trong thoi gian bao tri. Vui long thu lai sau.',
      );
    }

    next();
  }
}
