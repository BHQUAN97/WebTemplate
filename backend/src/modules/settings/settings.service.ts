import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '../../common/services/base.service.js';
import { Setting, SettingType } from './entities/setting.entity.js';
import { CreateSettingDto } from './dto/create-setting.dto.js';
import { UpdateSettingDto } from './dto/update-setting.dto.js';

/**
 * Quan ly cau hinh he thong.
 * Ho tro get/set tung key, get theo group, va seed gia tri mac dinh.
 */
@Injectable()
export class SettingsService extends BaseService<Setting> {
  protected searchableFields = ['key', 'description'];

  constructor(
    @InjectRepository(Setting)
    private readonly settingRepo: Repository<Setting>,
  ) {
    super(settingRepo, 'Setting');
  }

  /**
   * Lay gia tri setting theo key.
   */
  async get(key: string): Promise<Setting> {
    const setting = await this.settingRepo.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting "${key}" not found`);
    }
    return setting;
  }

  /**
   * Lay gia tri da parse theo type.
   */
  async getValue(key: string): Promise<string | number | boolean | object> {
    const setting = await this.get(key);
    return this.parseValue(setting.value, setting.type);
  }

  /**
   * Set gia tri cho 1 key. Tao moi neu chua ton tai.
   */
  async set(key: string, value: string): Promise<Setting> {
    let setting = await this.settingRepo.findOne({ where: { key } });
    if (setting) {
      setting.value = value;
      return this.settingRepo.save(setting);
    }
    // Tao moi neu chua co
    return this.create({ key, value } as any);
  }

  /**
   * Lay tat ca settings theo group.
   */
  async getByGroup(group: string): Promise<Setting[]> {
    return this.settingRepo.find({
      where: { group },
      order: { key: 'ASC' },
    });
  }

  /**
   * Lay tat ca settings cong khai (cho frontend/public API).
   */
  async getPublicSettings(): Promise<Setting[]> {
    return this.settingRepo.find({
      where: { is_public: true },
      order: { group: 'ASC', key: 'ASC' },
    });
  }

  /**
   * Cap nhat nhieu settings cung luc.
   */
  async bulkSet(
    settings: { key: string; value: string }[],
  ): Promise<Setting[]> {
    const results: Setting[] = [];
    for (const item of settings) {
      const result = await this.set(item.key, item.value);
      results.push(result);
    }
    return results;
  }

  /**
   * Seed cac gia tri mac dinh khi khoi tao he thong.
   * Chi tao nhung key chua ton tai.
   */
  async initDefaults(): Promise<void> {
    const defaults: CreateSettingDto[] = [
      {
        key: 'site_name',
        value: 'WebTemplate',
        type: SettingType.STRING,
        group: 'general',
        description: 'Ten website',
        is_public: true,
      },
      {
        key: 'site_description',
        value: 'A modern web application template',
        type: SettingType.STRING,
        group: 'general',
        description: 'Mo ta ngan ve website',
        is_public: true,
      },
      {
        key: 'logo_url',
        value: '/images/logo.png',
        type: SettingType.STRING,
        group: 'general',
        description: 'URL logo chinh',
        is_public: true,
      },
      {
        key: 'currency',
        value: 'VND',
        type: SettingType.STRING,
        group: 'general',
        description: 'Don vi tien te mac dinh',
        is_public: true,
      },
      {
        key: 'timezone',
        value: 'Asia/Ho_Chi_Minh',
        type: SettingType.STRING,
        group: 'general',
        description: 'Mui gio mac dinh',
        is_public: true,
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        type: SettingType.BOOLEAN,
        group: 'system',
        description: 'Bat/tat che do bao tri',
        is_public: false,
      },
    ];

    for (const item of defaults) {
      const exists = await this.settingRepo.findOne({
        where: { key: item.key },
      });
      if (!exists) {
        await this.create(item as any);
        this.logger.log(`Seeded default setting: ${item.key}`);
      }
    }
  }

  /**
   * Parse gia tri setting theo type.
   */
  private parseValue(
    value: string,
    type: SettingType,
  ): string | number | boolean | object {
    switch (type) {
      case SettingType.NUMBER:
        return Number(value);
      case SettingType.BOOLEAN:
        return value === 'true';
      case SettingType.JSON:
        return JSON.parse(value);
      default:
        return value;
    }
  }
}
