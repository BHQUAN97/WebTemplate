import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { Translation } from './entities/translation.entity.js';
import { Locale } from './entities/locale.entity.js';
import { CreateTranslationDto } from './dto/create-translation.dto.js';
import { BulkTranslationsDto } from './dto/bulk-translations.dto.js';

/**
 * Quan ly i18n — CRUD translations, export/import locale, quan ly languages.
 */
@Injectable()
export class I18nService extends BaseService<Translation> {
  protected searchableFields = ['key', 'value'];

  constructor(
    @InjectRepository(Translation)
    private readonly translationRepo: Repository<Translation>,
    @InjectRepository(Locale)
    private readonly localeRepo: Repository<Locale>,
  ) {
    super(translationRepo, 'Translation');
  }

  /**
   * Lay tat ca translations cua 1 locale, tuy chon loc theo namespace.
   * Tra ve dang key-value map nhom theo namespace.
   */
  async getTranslations(
    locale: string,
    namespace?: string,
  ): Promise<Record<string, Record<string, string>>> {
    const qb = this.translationRepo
      .createQueryBuilder('t')
      .where('t.locale = :locale', { locale })
      .andWhere('t.deleted_at IS NULL');

    if (namespace) {
      qb.andWhere('t.namespace = :namespace', { namespace });
    }

    qb.orderBy('t.namespace', 'ASC').addOrderBy('t.key', 'ASC');
    const translations = await qb.getMany();

    // Nhom theo namespace
    const result: Record<string, Record<string, string>> = {};
    for (const t of translations) {
      if (!result[t.namespace]) {
        result[t.namespace] = {};
      }
      result[t.namespace][t.key] = t.value;
    }

    return result;
  }

  /**
   * Set 1 translation — tao moi hoac cap nhat neu da ton tai.
   */
  async setTranslation(dto: CreateTranslationDto): Promise<Translation> {
    const existing = await this.translationRepo.findOne({
      where: {
        locale: dto.locale,
        namespace: dto.namespace,
        key: dto.key,
      },
    });

    if (existing) {
      existing.value = dto.value;
      return this.translationRepo.save(existing);
    }

    return this.create(dto as any);
  }

  /**
   * Set nhieu translations cung luc — batch upsert thay vi N+1 find+save.
   * Dung INSERT ... ON DUPLICATE KEY UPDATE de ghi nhieu rows trong 1 query.
   */
  async bulkSet(dto: BulkTranslationsDto): Promise<{ count: number }> {
    return this.batchUpsertTranslations(dto.translations);
  }

  /**
   * Lay danh sach locales (ngon ngu) dang active.
   */
  async getLocales(): Promise<Locale[]> {
    return this.localeRepo.find({
      where: { is_active: true },
      order: { sort_order: 'ASC' },
    });
  }

  /**
   * Dat 1 locale lam mac dinh. Bo mac dinh cua locale cu.
   */
  async setDefaultLocale(code: string): Promise<Locale> {
    // Bo mac dinh cu
    await this.localeRepo
      .createQueryBuilder()
      .update(Locale)
      .set({ is_default: false })
      .where('is_default = :val', { val: true })
      .execute();

    // Set mac dinh moi
    const locale = await this.localeRepo.findOne({ where: { code } });
    if (!locale) {
      throw new NotFoundException(`Locale "${code}" not found`);
    }

    locale.is_default = true;
    return this.localeRepo.save(locale);
  }

  /**
   * Export toan bo translations cua 1 locale thanh JSON.
   * Format: { namespace: { key: value } }
   */
  async exportLocale(
    locale: string,
  ): Promise<Record<string, Record<string, string>>> {
    return this.getTranslations(locale);
  }

  /**
   * Import translations tu JSON — bulk upsert (1 query thay vi N).
   */
  async importLocale(
    locale: string,
    data: Record<string, Record<string, string>>,
  ): Promise<{ imported: number }> {
    const items: CreateTranslationDto[] = [];
    for (const [namespace, keys] of Object.entries(data)) {
      for (const [key, value] of Object.entries(keys)) {
        items.push({ locale, namespace, key, value } as CreateTranslationDto);
      }
    }
    if (items.length === 0) return { imported: 0 };
    const result = await this.batchUpsertTranslations(items);
    return { imported: result.count };
  }

  /**
   * INSERT ... ON DUPLICATE KEY UPDATE batch — chia thanh chunks 500 rows
   * de tranh max_allowed_packet limit.
   */
  private async batchUpsertTranslations(
    items: CreateTranslationDto[],
  ): Promise<{ count: number }> {
    if (!items.length) return { count: 0 };
    const CHUNK = 500;
    let total = 0;
    const { generateUlid } = await import('../../common/utils/ulid.js');
    for (let i = 0; i < items.length; i += CHUNK) {
      const chunk = items.slice(i, i + CHUNK);
      const placeholders = chunk
        .map(() => '(?, ?, ?, ?, ?, ?)')
        .join(', ');
      const params: any[] = [];
      for (const item of chunk) {
        params.push(
          generateUlid(),
          item.locale,
          item.namespace,
          item.key,
          item.value,
          (item as any).tenant_id ?? null,
        );
      }
      const sql = `
        INSERT INTO translations (id, locale, namespace, \`key\`, value, tenant_id)
        VALUES ${placeholders}
        ON DUPLICATE KEY UPDATE value = VALUES(value), updated_at = CURRENT_TIMESTAMP
      `;
      await this.translationRepo.query(sql, params);
      total += chunk.length;
    }
    return { count: total };
  }
}
