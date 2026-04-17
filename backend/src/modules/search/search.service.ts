/**
 * Search service — tim kiem toan cuc across products, articles, pages.
 *
 * ! YEU CAU CO SO DU LIEU:
 * Service nay uu tien su dung MySQL FULLTEXT indexes de scale (thay cho LIKE '%...%').
 * Tao index truoc khi chay (neu chua co) bang migration SQL:
 *
 *   ALTER TABLE products ADD FULLTEXT INDEX ft_products (name, description, short_description);
 *   ALTER TABLE articles ADD FULLTEXT INDEX ft_articles (title, content, excerpt);
 *   ALTER TABLE pages    ADD FULLTEXT INDEX ft_pages    (title, content);
 *
 * Xem: backend/src/database/migrations/README.md
 *
 * Neu index chua ton tai, service se tu fallback ve LIKE va log canh bao mot lan
 * cho moi bang de tranh noise log.
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { SearchDto } from './dto/search.dto.js';

export interface SearchResult {
  type: 'product' | 'article' | 'page';
  id: string;
  title: string;
  excerpt: string;
  url: string;
  image: string | null;
  score: number;
}

// Ky tu can strip khoi query khi dung BOOLEAN MODE de tranh SQL injection / syntax error.
// MySQL FULLTEXT BOOLEAN operators: + - < > ( ) ~ * " @
const BOOLEAN_SPECIAL_CHARS_RE = /[+\-<>()~*"@]/g;

// MIN length cho NATURAL LANGUAGE MODE — query ngan hon se rot xuong BOOLEAN + wildcard.
const MIN_NATURAL_LEN = 3;

/**
 * Sanitize query cho MySQL FULLTEXT BOOLEAN mode.
 * Strip operator chars, collapse whitespace, append `*` cho prefix match.
 */
function toBooleanQuery(raw: string): string {
  const cleaned = raw.replace(BOOLEAN_SPECIAL_CHARS_RE, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  // Moi tu them `*` — cho phep prefix match: "lap" -> "lap*"
  return cleaned
    .split(' ')
    .filter((w) => w.length > 0)
    .map((w) => `${w}*`)
    .join(' ');
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger('SearchService');

  // Flag theo bang — log canh bao fallback chi 1 lan
  private fallbackWarned = { products: false, articles: false, pages: false };

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Tim kiem tren nhieu bang — tra ve ket qua thong nhat.
   * Uu tien FULLTEXT (natural hoac boolean mode), fallback LIKE neu index thieu.
   */
  async search(
    dto: SearchDto,
  ): Promise<{ items: SearchResult[]; total: number }> {
    const { query, type = 'all', page = 1, limit = 20 } = dto;
    const offset = (page - 1) * limit;
    const results: SearchResult[] = [];

    // Chon mode: BOOLEAN + wildcard cho query ngan (< 3 ky tu), NATURAL cho query dai
    const useBoolean = query.trim().length < MIN_NATURAL_LEN;
    const booleanQuery = toBooleanQuery(query);

    if (type === 'all' || type === 'product') {
      const rows = await this.searchProducts(query, booleanQuery, useBoolean, limit);
      for (const p of rows) {
        results.push({
          type: 'product',
          id: p.id,
          title: p.title,
          excerpt: p.excerpt || '',
          url: `/products/${p.slug}`,
          image: p.image ? this.safeParseImage(p.image) : null,
          score: Number(p.score) || 0,
        });
      }
    }

    if (type === 'all' || type === 'article') {
      const rows = await this.searchArticles(query, booleanQuery, useBoolean, limit);
      for (const a of rows) {
        results.push({
          type: 'article',
          id: a.id,
          title: a.title,
          excerpt: a.excerpt || '',
          url: `/articles/${a.slug}`,
          image: a.image || null,
          score: Number(a.score) || 0,
        });
      }
    }

    if (type === 'all' || type === 'page') {
      const rows = await this.searchPages(query, booleanQuery, useBoolean, limit);
      for (const pg of rows) {
        results.push({
          type: 'page',
          id: pg.id,
          title: pg.title,
          excerpt: '',
          url: `/pages/${pg.slug}`,
          image: pg.image || null,
          score: Number(pg.score) || 0,
        });
      }
    }

    // Sap xep theo score giam dan, paginate
    results.sort((a, b) => b.score - a.score);
    const paged = results.slice(offset, offset + limit);

    return { items: paged, total: results.length };
  }

  // ---------------- PRODUCTS ----------------

  private async searchProducts(
    query: string,
    booleanQuery: string,
    useBoolean: boolean,
    limit: number,
  ): Promise<any[]> {
    try {
      if (useBoolean) {
        if (!booleanQuery) return [];
        return await this.dataSource.query(
          `SELECT id, name AS title, short_description AS excerpt, slug,
                  JSON_EXTRACT(images, '$[0].url') AS image,
                  MATCH(name, description, short_description)
                    AGAINST (? IN BOOLEAN MODE) AS score
           FROM products
           WHERE deleted_at IS NULL AND is_active = 1
             AND MATCH(name, description, short_description)
                   AGAINST (? IN BOOLEAN MODE)
           ORDER BY score DESC
           LIMIT ?`,
          [booleanQuery, booleanQuery, limit],
        );
      }
      return await this.dataSource.query(
        `SELECT id, name AS title, short_description AS excerpt, slug,
                JSON_EXTRACT(images, '$[0].url') AS image,
                MATCH(name, description, short_description)
                  AGAINST (? IN NATURAL LANGUAGE MODE) AS score
         FROM products
         WHERE deleted_at IS NULL AND is_active = 1
           AND MATCH(name, description, short_description)
                 AGAINST (? IN NATURAL LANGUAGE MODE)
         ORDER BY score DESC
         LIMIT ?`,
        [query, query, limit],
      );
    } catch (err) {
      return this.fallbackLike('products', query, limit, err);
    }
  }

  // ---------------- ARTICLES ----------------

  private async searchArticles(
    query: string,
    booleanQuery: string,
    useBoolean: boolean,
    limit: number,
  ): Promise<any[]> {
    try {
      if (useBoolean) {
        if (!booleanQuery) return [];
        return await this.dataSource.query(
          `SELECT id, title, excerpt, slug, featured_image AS image,
                  MATCH(title, content, excerpt)
                    AGAINST (? IN BOOLEAN MODE) AS score
           FROM articles
           WHERE deleted_at IS NULL AND status = 'published'
             AND MATCH(title, content, excerpt)
                   AGAINST (? IN BOOLEAN MODE)
           ORDER BY score DESC
           LIMIT ?`,
          [booleanQuery, booleanQuery, limit],
        );
      }
      return await this.dataSource.query(
        `SELECT id, title, excerpt, slug, featured_image AS image,
                MATCH(title, content, excerpt)
                  AGAINST (? IN NATURAL LANGUAGE MODE) AS score
         FROM articles
         WHERE deleted_at IS NULL AND status = 'published'
           AND MATCH(title, content, excerpt)
                 AGAINST (? IN NATURAL LANGUAGE MODE)
         ORDER BY score DESC
         LIMIT ?`,
        [query, query, limit],
      );
    } catch (err) {
      return this.fallbackLike('articles', query, limit, err);
    }
  }

  // ---------------- PAGES ----------------

  private async searchPages(
    query: string,
    booleanQuery: string,
    useBoolean: boolean,
    limit: number,
  ): Promise<any[]> {
    try {
      if (useBoolean) {
        if (!booleanQuery) return [];
        return await this.dataSource.query(
          `SELECT id, title, slug, featured_image AS image,
                  MATCH(title, content) AGAINST (? IN BOOLEAN MODE) AS score
           FROM pages
           WHERE deleted_at IS NULL AND is_active = 1
             AND MATCH(title, content) AGAINST (? IN BOOLEAN MODE)
           ORDER BY score DESC
           LIMIT ?`,
          [booleanQuery, booleanQuery, limit],
        );
      }
      return await this.dataSource.query(
        `SELECT id, title, slug, featured_image AS image,
                MATCH(title, content) AGAINST (? IN NATURAL LANGUAGE MODE) AS score
         FROM pages
         WHERE deleted_at IS NULL AND is_active = 1
           AND MATCH(title, content) AGAINST (? IN NATURAL LANGUAGE MODE)
         ORDER BY score DESC
         LIMIT ?`,
        [query, query, limit],
      );
    } catch (err) {
      return this.fallbackLike('pages', query, limit, err);
    }
  }

  // ---------------- FALLBACK ----------------

  /**
   * Fallback LIKE khi FULLTEXT index khong ton tai hoac bang khong co.
   * Log canh bao 1 lan duy nhat cho moi bang.
   */
  private async fallbackLike(
    table: 'products' | 'articles' | 'pages',
    query: string,
    limit: number,
    err: unknown,
  ): Promise<any[]> {
    const msg = err instanceof Error ? err.message : String(err);

    // Neu bang khong ton tai (ER_NO_SUCH_TABLE) thi tra ve rong, khong can warn
    if (/doesn't exist|ER_NO_SUCH_TABLE/i.test(msg)) {
      return [];
    }

    if (!this.fallbackWarned[table]) {
      this.logger.warn(
        `FULLTEXT index not found on ${table}, falling back to LIKE. ` +
          `Run migration to create index — see backend/src/database/migrations/README.md. ` +
          `(original error: ${msg})`,
      );
      this.fallbackWarned[table] = true;
    }

    const searchTerm = `%${query}%`;

    try {
      if (table === 'products') {
        return await this.dataSource.query(
          `SELECT id, name AS title, short_description AS excerpt, slug,
                  JSON_EXTRACT(images, '$[0].url') AS image,
                  CASE
                    WHEN name LIKE ? THEN 3
                    WHEN short_description LIKE ? THEN 2
                    WHEN description LIKE ? THEN 1
                    ELSE 0
                  END AS score
           FROM products
           WHERE deleted_at IS NULL AND is_active = 1
             AND (name LIKE ? OR description LIKE ? OR short_description LIKE ?)
           ORDER BY score DESC
           LIMIT ?`,
          [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limit],
        );
      }
      if (table === 'articles') {
        return await this.dataSource.query(
          `SELECT id, title, excerpt, slug, featured_image AS image,
                  CASE
                    WHEN title LIKE ? THEN 3
                    WHEN excerpt LIKE ? THEN 2
                    WHEN content LIKE ? THEN 1
                    ELSE 0
                  END AS score
           FROM articles
           WHERE deleted_at IS NULL AND status = 'published'
             AND (title LIKE ? OR content LIKE ? OR excerpt LIKE ?)
           ORDER BY score DESC
           LIMIT ?`,
          [searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, limit],
        );
      }
      // pages
      return await this.dataSource.query(
        `SELECT id, title, slug, featured_image AS image,
                CASE
                  WHEN title LIKE ? THEN 3
                  WHEN content LIKE ? THEN 1
                  ELSE 0
                END AS score
         FROM pages
         WHERE deleted_at IS NULL AND is_active = 1
           AND (title LIKE ? OR content LIKE ?)
         ORDER BY score DESC
         LIMIT ?`,
        [searchTerm, searchTerm, searchTerm, searchTerm, limit],
      );
    } catch {
      // Bang that su khong ton tai — bo qua lang
      return [];
    }
  }

  /**
   * JSON_EXTRACT tra ve string da bao trong dau `"..."` — parse hoac strip an toan.
   */
  private safeParseImage(raw: string): string | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw);
      return typeof parsed === 'string' ? parsed : null;
    } catch {
      // Neu khong phai JSON valid, tra ve nguyen ban da strip quote
      return raw.replace(/^"|"$/g, '') || null;
    }
  }
}
