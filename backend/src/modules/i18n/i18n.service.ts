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
   * Set nhieu translations cung luc (upsert).
   */
  async bulkSet(dto: BulkTranslationsDto): Promise<Translation[]> {
    const results: Translation[] = [];
    for (const item of dto.translations) {
      const result = await this.setTranslation(item);
      results.push(result);
    }
    return results;
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
   * Import translations tu JSON — bulk upsert.
   * Data format: { namespace: { key: value } }
   */
  async importLocale(
    locale: string,
    data: Record<string, Record<string, string>>,
  ): Promise<{ imported: number }> {
    let imported = 0;

    for (const [namespace, keys] of Object.entries(data)) {
      for (const [key, value] of Object.entries(keys)) {
        await this.setTranslation({ locale, namespace, key, value });
        imported++;
      }
    }

    return { imported };
  }
}
