import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SettingsService } from '../settings/settings.service.js';
import { ArticlesService } from '../articles/articles.service.js';
import { PagesService } from '../pages/pages.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

/**
 * SEO service — sitemap, robots.txt, meta tags, JSON-LD.
 * Khong co entity rieng, su dung du lieu tu Settings, Articles, Pages.
 */
@Injectable()
export class SeoService {
  private readonly logger = new Logger('SeoService');

  constructor(
    private readonly settingsService: SettingsService,
    private readonly articlesService: ArticlesService,
    private readonly pagesService: PagesService,
  ) {}

  /**
   * Tao sitemap.xml — gom tat ca bai viet + trang da xuat ban.
   */
  async generateSitemap(): Promise<string> {
    let siteUrl = 'https://example.com';
    try {
      const setting = await this.settingsService.get('site_url');
      siteUrl = setting.value;
    } catch {
      // Dung gia tri mac dinh neu chua cau hinh
    }

    // Lay tat ca bai viet da xuat ban
    const { items: articles } = await this.articlesService.findPublished(
      { page: 1, limit: 10000 } as PaginationDto,
    );

    // Lay tat ca trang da xuat ban
    const pages = await this.pagesService.findPublished();

    const urls: string[] = [];

    // Trang chu
    urls.push(this.buildSitemapUrl(siteUrl, '/', '1.0', 'daily'));

    // Cac trang tinh
    for (const page of pages) {
      urls.push(
        this.buildSitemapUrl(
          siteUrl,
          `/${page.slug}`,
          '0.8',
          'weekly',
          page.updated_at,
        ),
      );
    }

    // Cac bai viet
    for (const article of articles) {
      urls.push(
        this.buildSitemapUrl(
          siteUrl,
          `/articles/${article.slug}`,
          '0.7',
          'weekly',
          article.updated_at,
        ),
      );
    }

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      ...urls,
      '</urlset>',
    ].join('\n');
  }

  /**
   * Tao robots.txt.
   */
  async generateRobots(): Promise<string> {
    let siteUrl = 'https://example.com';
    try {
      const setting = await this.settingsService.get('site_url');
      siteUrl = setting.value;
    } catch {
      // Dung gia tri mac dinh
    }

    return [
      'User-agent: *',
      'Allow: /',
      'Disallow: /admin/',
      'Disallow: /api/',
      '',
      `Sitemap: ${siteUrl}/seo/sitemap.xml`,
    ].join('\n');
  }

  /**
   * Lay meta tags cho 1 trang hoac bai viet.
   */
  async getMetaTags(
    type: string,
    slug: string,
  ): Promise<Record<string, string | null>> {
    if (type === 'article') {
      const article = await this.articlesService.findBySlug(slug);
      return {
        title: article.seo_title || article.title,
        description: article.seo_description || article.excerpt,
        keywords: article.seo_keywords,
        og_type: 'article',
        og_image: article.featured_image,
      };
    }

    if (type === 'page') {
      const page = await this.pagesService.findBySlug(slug);
      return {
        title: page.seo_title || page.title,
        description: page.seo_description,
        keywords: null,
        og_type: 'website',
        og_image: null,
      };
    }

    throw new NotFoundException(`Unknown content type "${type}"`);
  }

  /**
   * Tao JSON-LD structured data.
   */
  generateJsonLd(
    type: string,
    data: Record<string, any>,
  ): Record<string, any> {
    if (type === 'article') {
      return {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: data.title,
        description: data.excerpt || data.seo_description,
        image: data.featured_image,
        datePublished: data.published_at,
        dateModified: data.updated_at,
        author: {
          '@type': 'Person',
          name: data.author_name || 'Unknown',
        },
      };
    }

    if (type === 'page') {
      return {
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: data.title,
        description: data.seo_description,
        dateModified: data.updated_at,
      };
    }

    // Default: WebSite
    return {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: data.site_name,
      url: data.site_url,
      description: data.site_description,
    };
  }

  /**
   * Build 1 URL entry cho sitemap.
   */
  private buildSitemapUrl(
    baseUrl: string,
    path: string,
    priority: string,
    changefreq: string,
    lastmod?: Date,
  ): string {
    const lines = [
      '  <url>',
      `    <loc>${baseUrl}${path}</loc>`,
    ];
    if (lastmod) {
      lines.push(`    <lastmod>${lastmod.toISOString().split('T')[0]}</lastmod>`);
    }
    lines.push(`    <changefreq>${changefreq}</changefreq>`);
    lines.push(`    <priority>${priority}</priority>`);
    lines.push('  </url>');
    return lines.join('\n');
  }
}
