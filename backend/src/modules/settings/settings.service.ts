import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
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
export class SettingsService
  extends BaseService<Setting>
  implements OnModuleInit
{
  protected searchableFields = ['key', 'description'];

  // In-memory cache cho settings — settings doc rat nhieu (auth.service goi
  // 3-4 lan/login), thay doi rat it. TTL 60s cho admin update co hieu luc nhanh.
  private valueCache = new Map<string, { value: any; at: number }>();
  private static readonly CACHE_TTL_MS = 60 * 1000;

  constructor(
    @InjectRepository(Setting)
    private readonly settingRepo: Repository<Setting>,
  ) {
    super(settingRepo, 'Setting');
  }

  /**
   * Invalidate cache cho 1 key — goi sau set/bulkSet.
   */
  private invalidateCache(key?: string): void {
    if (key) {
      this.valueCache.delete(key);
    } else {
      this.valueCache.clear();
    }
  }

  // Seed cac key mac dinh khi backend khoi dong (chi tao key chua ton tai)
  async onModuleInit(): Promise<void> {
    try {
      await this.initDefaults();
    } catch (err) {
      this.logger.warn(
        `Bo qua seed settings (co the DB chua san sang): ${(err as Error).message}`,
      );
    }
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
   * Helper lay gia tri voi default — tra ve default neu key khong ton tai
   * (khong throw). Dung cho flags/toggles trong code thong thuong.
   * Cache TTL 60s — invalidate khi set/bulkSet.
   */
  async getOrDefault<T extends string | number | boolean | object>(
    key: string,
    defaultValue: T,
  ): Promise<T> {
    const cached = this.valueCache.get(key);
    if (cached && Date.now() - cached.at < SettingsService.CACHE_TTL_MS) {
      return cached.value as T;
    }
    const setting = await this.settingRepo.findOne({ where: { key } });
    if (!setting) {
      this.valueCache.set(key, { value: defaultValue, at: Date.now() });
      return defaultValue;
    }
    try {
      const parsed = this.parseValue(setting.value, setting.type) as T;
      this.valueCache.set(key, { value: parsed, at: Date.now() });
      return parsed;
    } catch {
      return defaultValue;
    }
  }

  /**
   * Shortcut: lay boolean flag voi default. Dung cho feature toggles.
   */
  async getBoolean(key: string, defaultValue = false): Promise<boolean> {
    const val = await this.getOrDefault<boolean>(key, defaultValue);
    return Boolean(val);
  }

  /**
   * Set gia tri cho 1 key. Tao moi neu chua ton tai. Invalidate cache.
   */
  async set(key: string, value: string): Promise<Setting> {
    this.invalidateCache(key);
    const setting = await this.settingRepo.findOne({ where: { key } });
    if (setting) {
      setting.value = value;
      return this.settingRepo.save(setting);
    }
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
   * Cap nhat nhieu settings cung luc. Invalidate cache toan bo.
   */
  async bulkSet(
    settings: { key: string; value: string }[],
  ): Promise<Setting[]> {
    const results: Setting[] = [];
    for (const item of settings) {
      const result = await this.set(item.key, item.value);
      results.push(result);
    }
    this.invalidateCache(); // clear all to be safe
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
      // === Email settings — flags dieu khien luong gui email ===
      {
        key: 'email.enabled',
        value: 'false',
        type: SettingType.BOOLEAN,
        group: 'email',
        description:
          'Master switch — neu false, moi email se bi skip (log warning)',
        is_public: false,
      },
      {
        key: 'email.verification_required',
        value: 'false',
        type: SettingType.BOOLEAN,
        group: 'email',
        description:
          'Yeu cau xac thuc email truoc khi dang nhap (gui link verify sau khi register)',
        is_public: false,
      },
      {
        key: 'email.welcome_enabled',
        value: 'false',
        type: SettingType.BOOLEAN,
        group: 'email',
        description: 'Gui email chao mung cho user moi dang ky',
        is_public: false,
      },
      {
        key: 'email.password_reset_enabled',
        value: 'true',
        type: SettingType.BOOLEAN,
        group: 'email',
        description:
          'Cho phep flow quen mat khau qua email. Neu false, /auth/forgot-password se no-op',
        is_public: false,
      },
      // === CTA settings — dieu khien cac nut lien he noi bat tren frontend ===
      {
        key: 'cta.zalo_enabled',
        value: 'false',
        type: SettingType.BOOLEAN,
        group: 'cta',
        description: 'Hien thi nut Zalo floating',
        is_public: true,
      },
      {
        key: 'cta.zalo_phone',
        value: '',
        type: SettingType.STRING,
        group: 'cta',
        description: 'So dien thoai Zalo (dang 84xxxxxxxxx hoac 0xxxxxxxxx)',
        is_public: true,
      },
      {
        key: 'cta.messenger_enabled',
        value: 'false',
        type: SettingType.BOOLEAN,
        group: 'cta',
        description: 'Hien thi nut Messenger floating',
        is_public: true,
      },
      {
        key: 'cta.messenger_url',
        value: '',
        type: SettingType.STRING,
        group: 'cta',
        description: 'Link Messenger (https://m.me/your-page)',
        is_public: true,
      },
      {
        key: 'cta.phone_enabled',
        value: 'false',
        type: SettingType.BOOLEAN,
        group: 'cta',
        description: 'Hien thi nut goi dien floating',
        is_public: true,
      },
      {
        key: 'cta.phone_number',
        value: '',
        type: SettingType.STRING,
        group: 'cta',
        description: 'So dien thoai hotline (dung cho tel: link)',
        is_public: true,
      },
      {
        key: 'cta.whatsapp_enabled',
        value: 'false',
        type: SettingType.BOOLEAN,
        group: 'cta',
        description: 'Hien thi nut WhatsApp floating',
        is_public: true,
      },
      {
        key: 'cta.whatsapp_number',
        value: '',
        type: SettingType.STRING,
        group: 'cta',
        description: 'So WhatsApp (dang quoc te, vd: 84901234567)',
        is_public: true,
      },
      {
        key: 'cta.email_enabled',
        value: 'false',
        type: SettingType.BOOLEAN,
        group: 'cta',
        description: 'Hien thi nut Email floating',
        is_public: true,
      },
      {
        key: 'cta.email_address',
        value: '',
        type: SettingType.STRING,
        group: 'cta',
        description: 'Email lien he (dung cho mailto: link)',
        is_public: true,
      },
      {
        key: 'cta.back_to_top_enabled',
        value: 'true',
        type: SettingType.BOOLEAN,
        group: 'cta',
        description: 'Hien thi nut cuon len dau trang (chi khi scroll >300px)',
        is_public: true,
      },
      {
        key: 'cta.bottom_tab_enabled',
        value: 'true',
        type: SettingType.BOOLEAN,
        group: 'cta',
        description:
          'Hien thi bottom tab bar tren mobile (Home/Search/Cart/Account)',
        is_public: true,
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
