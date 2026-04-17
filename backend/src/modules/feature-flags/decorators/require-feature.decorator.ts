import { SetMetadata } from '@nestjs/common';

export const REQUIRE_FEATURE_KEY = 'require_feature_key';

/**
 * Decorator yeu cau 1 feature flag phai bat truoc khi cho vao route.
 * Dung cung FeatureFlagGuard → tra 404 neu flag tat.
 *
 * @example
 * ```ts
 * @RequireFeature('new_checkout')
 * @Post('checkout')
 * newCheckout() { ... }
 * ```
 */
export const RequireFeature = (key: string) =>
  SetMetadata(REQUIRE_FEATURE_KEY, key);
