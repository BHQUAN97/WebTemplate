import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { AuthService } from './auth.service.js';
import { RefreshToken } from './entities/refresh-token.entity.js';
import { User } from '../users/entities/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { TwoFactorService } from './two-factor.service.js';
import { SettingsService } from '../settings/settings.service.js';
import { MailService } from '../mail/mail.service.js';
import { AuditLogsService } from '../audit-logs/audit-logs.service.js';
import { REDIS_CLIENT } from '../../common/redis/redis.module.js';
import { UserRole } from '../../common/constants/index.js';
import * as hashUtils from '../../common/utils/hash.js';

// ============================================================
// Helpers
// ============================================================

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'admin-ulid-01',
    email: 'admin@webtemplate.com',
    password_hash: '$bcrypt$hash',
    name: 'Admin',
    role: UserRole.ADMIN,
    is_active: true,
    is_email_verified: true,
    two_factor_enabled: false,
    two_factor_secret: null,
    backup_codes_hash: null,
    reset_token_jti: null,
    email_verification_jti: null,
    provider: null,
    provider_id: null,
    avatar_url: null,
    phone: null,
    last_login_at: null,
    tenant_id: null,
    deleted_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    refreshTokens: [],
    ...overrides,
  } as unknown as User;
}

// ============================================================
// Mocks
// ============================================================

const mockRefreshTokenRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
};

const mockUserRepo = {
  findOneBy: jest.fn(),
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
};

const mockUsersService = {
  findByEmail: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  normalizeEmail: jest.fn((e: string) => e.toLowerCase().trim()),
};

const mockJwtService = {
  sign: jest.fn((_payload: any) => 'mock.jwt.token'),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    const cfg: Record<string, string> = {
      'jwt.accessSecret': 'test-access-secret',
      'jwt.refreshSecret': 'test-refresh-secret',
      'jwt.accessExpires': '15m',
      'jwt.refreshExpires': '7d',
    };
    return cfg[key] ?? null;
  }),
};

const mockTwoFactorService = {
  verify: jest.fn(),
};

const mockSettingsService = {
  getBoolean: jest.fn(async (_key: string, fallback: boolean) => fallback),
};

const mockMailService = {
  sendMail: jest.fn().mockResolvedValue(undefined),
};

const mockAuditLogsService = {
  log: jest.fn().mockResolvedValue(undefined),
};

/** In-memory Redis mock */
function createRedisMock() {
  const store = new Map<string, { val: string; expiresAt: number | null }>();
  return {
    get: jest.fn(async (key: string) => {
      const e = store.get(key);
      if (!e) return null;
      if (e.expiresAt !== null && Date.now() > e.expiresAt) { store.delete(key); return null; }
      return e.val;
    }),
    incr: jest.fn(async (key: string) => {
      const e = store.get(key);
      const n = e ? parseInt(e.val) + 1 : 1;
      store.set(key, { val: String(n), expiresAt: e?.expiresAt ?? null });
      return n;
    }),
    expire: jest.fn(async (key: string, ttl: number) => {
      const e = store.get(key);
      if (e) store.set(key, { val: e.val, expiresAt: Date.now() + ttl * 1000 });
      return 1;
    }),
    ttl: jest.fn(async (key: string) => {
      const e = store.get(key);
      if (!e || e.expiresAt === null) return -1;
      const rem = Math.ceil((e.expiresAt - Date.now()) / 1000);
      return rem > 0 ? rem : -2;
    }),
    del: jest.fn(async (key: string) => { store.delete(key); return 1; }),
    _clear: () => store.clear(),
  };
}

// ============================================================
// Tests
// ============================================================

describe('AuthService', () => {
  let service: AuthService;
  let redisMock: ReturnType<typeof createRedisMock>;

  beforeEach(async () => {
    redisMock = createRedisMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(RefreshToken), useValue: mockRefreshTokenRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: TwoFactorService, useValue: mockTwoFactorService },
        { provide: SettingsService, useValue: mockSettingsService },
        { provide: MailService, useValue: mockMailService },
        { provide: AuditLogsService, useValue: mockAuditLogsService },
        { provide: REDIS_CLIENT, useValue: redisMock },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
    redisMock._clear();
  });

  // ----------------------------------------------------------
  // validateUser
  // ----------------------------------------------------------
  describe('validateUser', () => {
    it('should return user khi email + password dung', async () => {
      const admin = makeUser();
      mockUsersService.findByEmail.mockResolvedValue(admin);
      jest.spyOn(hashUtils, 'comparePassword').mockResolvedValue(true);
      mockSettingsService.getBoolean.mockResolvedValue(false);

      const result = await service.validateUser('admin@webtemplate.com', 'Admin@123');
      expect(result.email).toBe('admin@webtemplate.com');
      expect(result.role).toBe(UserRole.ADMIN);
    });

    it('should throw 401 khi user khong ton tai (VPS bug: admin chua seed)', async () => {
      // Simulate VPS: admin user chua duoc tao do migrate.sh goi sai file admin.seed.ts
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.validateUser('admin@webtemplate.com', 'Admin@123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw 401 khi sai password', async () => {
      const admin = makeUser();
      mockUsersService.findByEmail.mockResolvedValue(admin);
      jest.spyOn(hashUtils, 'comparePassword').mockResolvedValue(false);

      await expect(
        service.validateUser('admin@webtemplate.com', 'WrongP@ss'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw 401 khi user bi disable (is_active=false)', async () => {
      const admin = makeUser({ is_active: false });
      mockUsersService.findByEmail.mockResolvedValue(admin);

      await expect(
        service.validateUser('admin@webtemplate.com', 'Admin@123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw 401 khi user la OAuth-only (khong co password_hash)', async () => {
      const admin = makeUser({ password_hash: null });
      mockUsersService.findByEmail.mockResolvedValue(admin);

      await expect(
        service.validateUser('admin@webtemplate.com', 'Admin@123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw 400 sau 5 lan sai (account lockout)', async () => {
      const admin = makeUser();
      mockUsersService.findByEmail.mockResolvedValue(admin);
      jest.spyOn(hashUtils, 'comparePassword').mockResolvedValue(false);

      // 5 lan sai password
      for (let i = 0; i < 5; i++) {
        await service.validateUser('admin@webtemplate.com', 'WrongP@ss').catch(() => {});
      }

      // Lan thu 6: checkLockout nen throw BadRequestException (khoa)
      jest.spyOn(hashUtils, 'comparePassword').mockResolvedValue(true);
      await expect(
        service.validateUser('admin@webtemplate.com', 'Admin@123'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ----------------------------------------------------------
  // login
  // ----------------------------------------------------------
  describe('login', () => {
    it('should tra ve accessToken + refreshToken khi admin login thanh cong', async () => {
      const admin = makeUser();
      mockUsersService.findByEmail.mockResolvedValue(admin);
      jest.spyOn(hashUtils, 'comparePassword').mockResolvedValue(true);
      mockSettingsService.getBoolean.mockResolvedValue(false);
      mockUsersService.update.mockResolvedValue(undefined);
      mockRefreshTokenRepo.create.mockReturnValue({});
      mockRefreshTokenRepo.save.mockResolvedValue({});

      const result = await service.login(
        { email: 'admin@webtemplate.com', password: 'Admin@123' },
        '127.0.0.1',
        'jest-test',
      );

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockAuditLogsService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'auth.login', user_id: admin.id }),
      );
    });

    it('should throw khi email chua ton tai (admin chua seed)', async () => {
      mockUsersService.findByEmail.mockResolvedValue(null);

      await expect(
        service.login({ email: 'admin@webtemplate.com', password: 'Admin@123' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw TWO_FACTOR_REQUIRED khi admin bat 2FA nhung khong truyen code', async () => {
      const admin = makeUser({ two_factor_enabled: true });
      mockUsersService.findByEmail.mockResolvedValue(admin);
      jest.spyOn(hashUtils, 'comparePassword').mockResolvedValue(true);
      mockSettingsService.getBoolean.mockResolvedValue(false);

      await expect(
        service.login({ email: 'admin@webtemplate.com', password: 'Admin@123' }),
      ).rejects.toMatchObject({
        response: expect.objectContaining({ code: 'TWO_FACTOR_REQUIRED' }),
      });
    });

    it('should normalize email truoc khi tim user', async () => {
      const admin = makeUser();
      mockUsersService.findByEmail.mockResolvedValue(admin);
      jest.spyOn(hashUtils, 'comparePassword').mockResolvedValue(true);
      mockSettingsService.getBoolean.mockResolvedValue(false);
      mockUsersService.update.mockResolvedValue(undefined);
      mockRefreshTokenRepo.create.mockReturnValue({});
      mockRefreshTokenRepo.save.mockResolvedValue({});

      // Email viet hoa phai duoc normalize
      await service.login({ email: 'ADMIN@WEBTEMPLATE.COM', password: 'Admin@123' });

      expect(mockUsersService.findByEmail).toHaveBeenCalledWith('admin@webtemplate.com');
    });
  });

  // ----------------------------------------------------------
  // generateTokens — kiem tra payload co role
  // ----------------------------------------------------------
  describe('generateTokens', () => {
    it('admin token payload phai chua role=admin', async () => {
      const admin = makeUser();
      mockRefreshTokenRepo.create.mockReturnValue({});
      mockRefreshTokenRepo.save.mockResolvedValue({});

      // Capture JWT sign call de check payload
      const signCalls: any[] = [];
      mockJwtService.sign.mockImplementation((payload: any) => {
        signCalls.push(payload);
        return 'mock.token';
      });

      await service.generateTokens(admin, '127.0.0.1', 'jest');

      expect(signCalls.length).toBeGreaterThanOrEqual(1);
      expect(signCalls[0].role).toBe(UserRole.ADMIN);
      expect(signCalls[0].sub).toBe(admin.id);
    });
  });
});
