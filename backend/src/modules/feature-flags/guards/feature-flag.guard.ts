import { Injectable, CanActivate, ExecutionContext, NotFoundException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { REQUIRE_FEATURE_KEY } from '../decorators/require-feature.decorator.js';
import { FeatureFlagsService } from '../feature-flags.service.js';
import type { ICurrentUser } from '../../../common/interfaces/index.js';

/**
 * Guard kiem tra @RequireFeature() — neu flag tat thi throw 404.
 * Tra 404 (khong phai 403) de tranh lo thong tin ve feature dang tat.
 */
@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const key = this.reflector.getAllAndOverride<string>(REQUIRE_FEATURE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!key) return true;

    const request = context.switchToHttp().getRequest<Request>();
    const user = (request as any).user as ICurrentUser | undefined;

    const enabled = await this.featureFlagsService.isEnabled(key, user);
    if (!enabled) {
      throw new NotFoundException();
    }
    return true;
  }
}
