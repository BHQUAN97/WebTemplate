import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FeatureFlag } from './entities/feature-flag.entity.js';
import { FeatureFlagsService } from './feature-flags.service.js';
import { FeatureFlagsController } from './feature-flags.controller.js';
import { FeatureFlagGuard } from './guards/feature-flag.guard.js';

/**
 * Module quan ly feature flags.
 * Export service + guard de module khac gan @RequireFeature + guard.
 */
@Module({
  imports: [TypeOrmModule.forFeature([FeatureFlag])],
  controllers: [FeatureFlagsController],
  providers: [FeatureFlagsService, FeatureFlagGuard],
  exports: [FeatureFlagsService, FeatureFlagGuard],
})
export class FeatureFlagsModule {}
