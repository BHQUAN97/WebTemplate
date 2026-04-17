import {
  Controller,
  Get,
  Param,
  Header,
} from '@nestjs/common';
import { SeoService } from './seo.service.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { successResponse } from '../../common/utils/response.js';

@Controller('seo')
export class SeoController {
  constructor(private readonly seoService: SeoService) {}

  /**
   * Sitemap XML (public).
   */
  @Public()
  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  async sitemap() {
    return this.seoService.generateSitemap();
  }

  /**
   * Robots.txt (public).
   */
  @Public()
  @Get('robots.txt')
  @Header('Content-Type', 'text/plain')
  async robots() {
    return this.seoService.generateRobots();
  }

  /**
   * Meta tags cho 1 trang hoac bai viet (public).
   */
  @Public()
  @Get('meta/:type/:slug')
  async getMetaTags(
    @Param('type') type: string,
    @Param('slug') slug: string,
  ) {
    const meta = await this.seoService.getMetaTags(type, slug);
    return successResponse(meta);
  }
}
