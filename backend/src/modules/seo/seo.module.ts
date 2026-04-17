import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module.js';
import { ArticlesModule } from '../articles/articles.module.js';
import { PagesModule } from '../pages/pages.module.js';
import { SeoService } from './seo.service.js';
import { SeoController } from './seo.controller.js';

@Module({
  imports: [SettingsModule, ArticlesModule, PagesModule],
  controllers: [SeoController],
  providers: [SeoService],
  exports: [SeoService],
})
export class SeoModule {}
