# WebTemplate — Base Patterns & Conventions (BE + FE)

> Tai lieu quan trong nhat cua du an — mo ta tat ca reusable patterns, conventions, va cach tao module/page moi.

---

# BACKEND BASE PATTERNS

## 1. BaseEntity

**WHY:** Moi entity trong he thong can 4 thu: primary key duy nhat, thoi gian tao, thoi gian cap nhat, va kha nang soft delete. `BaseEntity` cung cap tat ca, dam bao nhat quan tren 30+ modules.

### Code

```typescript
// backend/src/common/entities/base.entity.ts
import {
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  DeleteDateColumn,
  BeforeInsert,
} from 'typeorm';
import { generateUlid } from '../utils/ulid.js';

export abstract class BaseEntity {
  @PrimaryColumn({ type: 'char', length: 26 })
  id: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  created_at: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updated_at: Date;

  @DeleteDateColumn({ name: 'deleted_at', type: 'timestamp', nullable: true })
  deleted_at: Date | null;

  @BeforeInsert()
  generateId(): void {
    if (!this.id) {
      this.id = generateUlid();
    }
  }
}
```

### Dac diem

- **ULID** (26 ky tu): Thay the UUID — sortable theo thoi gian, URL-safe, khong bi fragment index
- **Timestamps**: `created_at` va `updated_at` duoc TypeORM tu dong quan ly
- **Soft delete**: `deleted_at` — khi xoa, TypeORM set timestamp thay vi DELETE. Query mac dinh loc `deleted_at IS NULL`
- **BeforeInsert hook**: Tu dong generate ULID neu chua co id

### Cach extend

```typescript
import { Entity, Column } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity.js';

@Entity('products')
export class ProductEntity extends BaseEntity {
  @Column({ length: 200 })
  name: string;

  @Column({ unique: true, length: 200 })
  slug: string;

  @Column({ type: 'decimal', precision: 12, scale: 0 })
  price: number;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true, length: 26 })
  category_id: string | null;
}
```

**Luu y:** Import phai dung `.js` extension (ESM compatibility).

---

## 2. BaseService\<T\>

**WHY:** CRUD operations giong nhau cho moi module — findAll (pagination + search), findById, create, update, softDelete, hardDelete, count. `BaseService` implement tat ca, child service chi can override khi can.

### Code

```typescript
// backend/src/common/services/base.service.ts
export abstract class BaseService<T extends BaseEntity> {
  protected readonly logger: Logger;
  protected searchableFields: string[] = [];
  protected defaultSort = 'created_at';

  constructor(
    protected readonly repository: Repository<T>,
    protected readonly entityName: string,
  ) {
    this.logger = new Logger(`${entityName}Service`);
  }

  // --- Cac method chinh ---

  async findAll(options: PaginationDto): Promise<{ items: T[]; meta: PaginationMeta }>
  async findById(id: string): Promise<T>
  async create(data: DeepPartial<T>): Promise<T>
  async update(id: string, data: DeepPartial<T>): Promise<T>
  async softDelete(id: string): Promise<void>
  async hardDelete(id: string): Promise<void>
  async count(): Promise<number>

  // --- Hook de override ---
  protected applyFilters(qb: SelectQueryBuilder<T>, options: PaginationDto): void
}
```

### findAll chi tiet

```typescript
async findAll(options: PaginationDto): Promise<{ items: T[]; meta: PaginationMeta }> {
  const { page, limit, search, sort, order } = options;
  const skip = (page - 1) * limit;

  const qb = this.repository
    .createQueryBuilder('entity')
    .where('entity.deleted_at IS NULL');

  // Tim kiem tren cac truong cho phep
  if (search && this.searchableFields.length > 0) {
    const searchConditions = this.searchableFields
      .map((field) => `entity.${field} LIKE :search`)
      .join(' OR ');
    qb.andWhere(`(${searchConditions})`, { search: `%${search}%` });
  }

  // Cho phep child class them dieu kien
  this.applyFilters(qb, options);

  qb.orderBy(`entity.${sortField}`, sortOrder)
    .skip(skip)
    .take(limit);

  const [items, total] = await qb.getManyAndCount();

  const meta: PaginationMeta = {
    page, limit, total,
    totalPages: Math.ceil(total / limit),
  };

  return { items, meta };
}
```

### Cach tao service moi

```typescript
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { BaseService } from '@/common/services/base.service.js';
import { ProductEntity } from './entities/product.entity.js';
import { PaginationDto } from '@/common/dto/pagination.dto.js';

@Injectable()
export class ProductsService extends BaseService<ProductEntity> {
  // Khai bao cac truong co the search
  protected searchableFields = ['name', 'slug', 'sku'];

  constructor(
    @InjectRepository(ProductEntity)
    repo: Repository<ProductEntity>,
  ) {
    super(repo, 'Product');
  }

  // Override applyFilters de them dieu kien rieng
  protected applyFilters(
    qb: SelectQueryBuilder<ProductEntity>,
    options: PaginationDto & { categoryId?: string; isActive?: boolean },
  ): void {
    if (options.categoryId) {
      qb.andWhere('entity.category_id = :categoryId', {
        categoryId: options.categoryId,
      });
    }
    if (options.isActive !== undefined) {
      qb.andWhere('entity.is_active = :isActive', {
        isActive: options.isActive,
      });
    }
  }

  // Them method rieng cho module nay
  async findBySlug(slug: string): Promise<ProductEntity | null> {
    return this.repository.findOne({
      where: { slug, deleted_at: IsNull() } as any,
    });
  }
}
```

---

## 3. Request Pipeline

**WHY:** Hieu thu tu xu ly request giup debug nhanh va biet dung cho de dat guard, interceptor, pipe.

```
Client → Nginx (reverse proxy, SSL)
  → NestJS Application
    → Middleware (helmet, CORS, cookieParser)
      → Guards
        1. JwtAuthGuard — xac thuc JWT token (bypass voi @Public())
        2. RolesGuard — kiem tra role (@Roles() decorator)
        3. TenantGuard — isolate data theo tenant
      → Interceptors (pre-handler)
        1. LoggingInterceptor — ghi nhan method, URL, user, start time
      → Pipes
        1. CustomValidationPipe — validate + transform DTO
      → Controller method
        → Service logic
          → TypeORM Repository → MySQL
        ← Service returns data
      ← Controller returns
    ← Interceptors (post-handler)
      1. TransformInterceptor — wrap response vao { success, data, message }
    ← Guards done
  ← AllExceptionsFilter catches errors → format error response
← Nginx ← Response
```

**Key insight:** Interceptors chay 2 lan — truoc (pre) va sau (post) handler. Guards chi chay truoc.

---

## 4. Guards

### 4.1. JwtAuthGuard

**WHY:** Bao ve tat ca routes mac dinh. Chi routes co `@Public()` moi duoc truy cap khong can token.

```typescript
// backend/src/common/guards/jwt-auth.guard.ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    // Kiem tra @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    return super.canActivate(context);
  }
}
```

**Cach dung:**
```typescript
// Route cong khai
@Public()
@Get('products')
findAll() { ... }

// Route can auth (mac dinh)
@Get('profile')
getProfile(@CurrentUser() user: ICurrentUser) { ... }
```

### 4.2. RolesGuard

**WHY:** Phan quyen theo role — admin, manager, editor, user.

```typescript
// backend/src/common/guards/roles.guard.ts
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY, [context.getHandler(), context.getClass()],
    );
    // Khong co @Roles() → cho phep tat ca authenticated users
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const user = request.user as ICurrentUser;
    const hasRole = requiredRoles.includes(user.role);
    if (!hasRole) {
      throw new ForbiddenException(
        `Access denied. Required roles: ${requiredRoles.join(', ')}`,
      );
    }
    return true;
  }
}
```

**Cach dung:**
```typescript
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Get('admin/users')
getUsers() { ... }
```

### 4.3. TenantGuard

**WHY:** Multi-tenant isolation — moi user chi thay data cua tenant minh.

```typescript
// backend/src/common/guards/tenant.guard.ts
@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const user = request.user as ICurrentUser;

    // Route cong khai → bo qua
    if (!user) return true;

    // Admin co the truy cap moi tenant (qua header x-tenant-id)
    if (user.role === UserRole.ADMIN) {
      request.tenantId = request.headers['x-tenant-id'] || user.tenantId;
      return true;
    }

    // User thuong phai co tenantId va chi truy cap tenant cua minh
    if (!user.tenantId) throw new ForbiddenException('Tenant context required');

    const headerTenantId = request.headers['x-tenant-id'];
    if (headerTenantId && headerTenantId !== user.tenantId) {
      throw new ForbiddenException('Cannot access other tenant data');
    }

    request.tenantId = user.tenantId;
    return true;
  }
}
```

**Key:** Admin truyen `x-tenant-id` header de truy cap data cua tenant khac. User thuong chi thay data cua minh.

---

## 5. Interceptors

### 5.1. TransformInterceptor

**WHY:** Moi response tu API phai co cung format — giup frontend xu ly nhat quan.

```typescript
// backend/src/common/interceptors/transform.interceptor.ts
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map((data) => {
        // Neu da dung format ApiResponse → khong wrap lai
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }
        return { success: true, data, message: 'Success' };
      }),
    );
  }
}
```

**Output:** Controller tra `return users;` → Client nhan `{ success: true, data: users, message: 'Success' }`.

### 5.2. LoggingInterceptor

**WHY:** Ghi nhan moi request de debug va monitor performance.

```typescript
// backend/src/common/interceptors/logging.interceptor.ts
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const { method, originalUrl, ip } = request;
    const userId = request.user?.id || 'anonymous';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `${method} ${originalUrl} ${response.statusCode} ${duration}ms | user:${userId} ip:${ip}`,
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.warn(
            `${method} ${originalUrl} ${error.status || 500} ${duration}ms | user:${userId} err:${error.message}`,
          );
        },
      }),
    );
  }
}
```

**Log format:** `GET /api/products 200 45ms | user:01HXYZ123 ip:192.168.1.1 ua:Mozilla/5.0...`

---

## 6. Exception Filter

**WHY:** Moi loi phai tra ve cung format, du la validation error, database error, hay server crash.

```typescript
// backend/src/common/filters/http-exception.filter.ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const { status, message, errors } = this.extractError(exception);
    // Format chuẩn
    response.status(status).json({
      success: false,
      message,
      errors,        // chi co khi validation error
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
```

### Cac loai loi duoc xu ly

| Exception | Status | Message |
|---|---|---|
| `HttpException` (NestJS) | Tuy loai (400, 401, 403, 404...) | Tu exception |
| Validation error (class-validator) | 400 | Mang cac validation messages |
| `QueryFailedError` — Duplicate entry (ER_DUP_ENTRY) | 409 | "Duplicate entry. This record already exists." |
| `QueryFailedError` — FK constraint (ER_NO_REFERENCED_ROW_2) | 400 | "Referenced record not found." |
| `EntityNotFoundError` | 404 | "Record not found." |
| Unknown Error | 500 | "Internal server error" (prod) hoac error.message (dev) |

### Error response vi du

```json
{
  "success": false,
  "message": "Vui long nhap email",
  "errors": [
    "Vui long nhap email",
    "Mat khau phai co it nhat 8 ky tu"
  ],
  "statusCode": 400,
  "timestamp": "2026-04-16T10:30:00.000Z",
  "path": "/api/auth/register"
}
```

---

## 7. Validation — CustomValidationPipe

**WHY:** Validate input tu dong, tu choi request sai truoc khi chay business logic. Error messages ro rang.

```typescript
// backend/src/common/pipes/validation.pipe.ts
export class CustomValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,          // Tu chuyen doi type (string → number)
      whitelist: true,           // Loai bo fields khong co trong DTO
      forbidNonWhitelisted: true,// Bao loi neu gui field khong cho phep
      transformOptions: {
        enableImplicitConversion: true,
      },
      exceptionFactory: (errors) => {
        const messages = formatErrors(errors); // Flatten nested errors
        return new BadRequestException({
          message: messages,
          error: 'Validation Error',
          statusCode: 400,
        });
      },
    });
  }
}
```

### Cach viet DTO voi validation

```typescript
import { IsString, IsNumber, IsOptional, Min, Max, Length } from 'class-validator';

export class CreateProductDto {
  @IsString()
  @Length(2, 200, { message: 'Ten san pham phai tu 2 den 200 ky tu' })
  name: string;

  @IsNumber()
  @Min(0, { message: 'Gia phai lon hon hoac bang 0' })
  price: number;

  @IsOptional()
  @IsString()
  @Length(0, 2000)
  description?: string;
}
```

### PaginationDto (base cho tat ca list endpoints)

```typescript
// backend/src/common/dto/pagination.dto.ts
export class PaginationDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page: number = 1;

  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit: number = 20;

  @IsOptional() @IsString()
  search?: string;

  @IsOptional() @IsString()
  sort?: string;

  @IsOptional() @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC' = 'DESC';
}
```

---

## 8. Custom Decorators

### @CurrentUser()

**WHY:** Lay user hien tai tu request — thay vi `req.user` manual.

```typescript
// backend/src/common/decorators/current-user.decorator.ts
export const CurrentUser = createParamDecorator(
  (data: keyof ICurrentUser | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as ICurrentUser;
    if (!user) return null;
    return data ? user[data] : user;
  },
);
```

**Cach dung:**
```typescript
// Lay toan bo user object
@Get('profile')
getProfile(@CurrentUser() user: ICurrentUser) {
  return user; // { id, email, role, tenantId }
}

// Lay 1 property cu the
@Get('my-id')
getMyId(@CurrentUser('id') userId: string) {
  return userId; // "01HXYZ..."
}
```

### @Roles()

```typescript
// backend/src/common/decorators/roles.decorator.ts
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Su dung:
@Roles(UserRole.ADMIN, UserRole.MANAGER)
@Delete(':id')
remove(@Param('id') id: string) { ... }
```

### @Public()

```typescript
// backend/src/common/decorators/public.decorator.ts
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Su dung:
@Public()
@Get('health')
healthCheck() { return { status: 'ok' }; }
```

---

## 9. API Response Format

**WHY:** Frontend luon biet data o dau trong response — khong can doan.

### Success Response

```typescript
// Tu dong wrap boi TransformInterceptor
{
  "success": true,
  "data": { ... },
  "message": "Success"
}
```

### Paginated Response

```typescript
// Dung helper function paginatedResponse()
{
  "success": true,
  "data": [
    { "id": "01HXYZ...", "name": "San pham A", ... },
    { "id": "01HXYZ...", "name": "San pham B", ... }
  ],
  "message": "Success",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 156,
    "totalPages": 8
  }
}
```

### Error Response

```typescript
{
  "success": false,
  "message": "Duplicate entry. This record already exists.",
  "statusCode": 409,
  "timestamp": "2026-04-16T10:30:00.000Z",
  "path": "/api/products"
}
```

### Response helper functions

```typescript
// backend/src/common/utils/response.ts
export function successResponse<T>(data: T, message = 'Success'): ApiResponse<T>
export function paginatedResponse<T>(data: T[], meta: PaginationMeta, message = 'Success'): ApiResponse<T[]>
export function errorResponse(message: string, data: any = null): ApiResponse<null>
```

**Cach dung trong controller:**
```typescript
@Get()
async findAll(@Query() query: PaginationDto) {
  const { items, meta } = await this.service.findAll(query);
  return paginatedResponse(items, meta);
}
```

---

## 10. Logger — AppLoggerService

**WHY:** Structured logging — dev doc duoc, prod parse duoc (JSON cho Datadog, ELK...).

```typescript
// backend/src/common/logger/app-logger.service.ts
@Injectable()
export class AppLoggerService implements LoggerService {
  // Production: JSON output
  // {"timestamp":"2026-04-16T10:30:00.000Z","level":"info","context":"HTTP","message":"GET /api/products 200 45ms"}

  // Development: colored console
  // 2026-04-16T10:30:00.000Z INFO    [HTTP] GET /api/products 200 45ms

  log(message: any, context?: string): void;
  error(message: any, trace?: string, context?: string): void;
  warn(message: any, context?: string): void;
  debug(message: any, context?: string): void;   // Chi in trong dev
  verbose(message: any, context?: string): void;  // Chi in trong dev
  access(data: AccessLogData): void;              // Structured access log
}
```

**Color mapping:**
- error → red
- warn → yellow
- info → green
- debug → cyan
- verbose → magenta
- access → blue

---

## 11. Module Config

**WHY:** Template co 30 modules — khong du an nao can het. Bat/tat de giam complexity va toc do khoi dong.

```typescript
// backend/src/common/utils/module-config.ts
export const DEFAULT_MODULE_CONFIG: ModuleConfig = {
  // Auth & Users (BAT BUOC)
  auth: { enabled: true },
  users: { enabled: true },
  tenants: { enabled: true },

  // Core (BAT BUOC)
  settings: { enabled: true },
  logs: { enabled: true },
  media: { enabled: true },

  // E-commerce
  products: { enabled: true },
  categories: { enabled: true },
  inventory: { enabled: true },
  cart: { enabled: true },
  orders: { enabled: true },
  payments: { enabled: true },
  reviews: { enabled: true },
  promotions: { enabled: true },

  // CMS
  articles: { enabled: true },
  pages: { enabled: true },
  navigation: { enabled: true },
  seo: { enabled: true },

  // Advanced
  notifications: { enabled: true },
  analytics: { enabled: true },
  search: { enabled: true },
  export: { enabled: true },
  import: { enabled: true },
  i18n: { enabled: true },
  contacts: { enabled: true },
  faq: { enabled: true },

  // SaaS
  plans: { enabled: true },
  apiKeys: { enabled: true },
  webhooks: { enabled: true },
  emailTemplates: { enabled: true },
};

// Kiem tra
export function isModuleEnabled(config: ModuleConfig, moduleName: string): boolean {
  const moduleConf = config[moduleName];
  if (!moduleConf) return true; // Mac dinh enabled
  return moduleConf.enabled;
}
```

**Required modules (KHONG duoc tat):** auth, users, settings, logs.

---

## 12. Utility Functions

### ULID Generator

```typescript
// backend/src/common/utils/ulid.ts
import { ulid } from 'ulid';
export function generateUlid(): string {
  return ulid(); // "01HXYZ5ABCDEFGHJKMNPQRST"
}
```

### Slug Generator

```typescript
// backend/src/common/utils/slug.ts
export function generateSlug(text: string): string {
  return slugify(text, { lower: true, strict: true, locale: 'vi', trim: true });
}
// "Ao Thun Nam" → "ao-thun-nam"

export async function generateUniqueSlug(
  text: string,
  checkExists: (slug: string) => Promise<boolean>,
  maxAttempts = 10,
): Promise<string> {
  const baseSlug = generateSlug(text);
  if (!await checkExists(baseSlug)) return baseSlug;
  // Them suffix ngau nhien: "ao-thun-nam-a1b2c3"
  // Fallback: "ao-thun-nam-lk5j8n" (timestamp base36)
}
```

### Password Hash

```typescript
// backend/src/common/utils/hash.ts
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12); // 12 salt rounds
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}
```

---

## 13. Naming Conventions

### Files

| Loai | Convention | Vi du |
|---|---|---|
| Entity | `{name}.entity.ts` | `product.entity.ts` |
| Service | `{name}.service.ts` | `products.service.ts` |
| Controller | `{name}.controller.ts` | `products.controller.ts` |
| Module | `{name}.module.ts` | `products.module.ts` |
| DTO | `create-{name}.dto.ts`, `update-{name}.dto.ts` | `create-product.dto.ts` |
| Guard | `{name}.guard.ts` | `jwt-auth.guard.ts` |
| Interceptor | `{name}.interceptor.ts` | `transform.interceptor.ts` |
| Filter | `{name}.filter.ts` | `http-exception.filter.ts` |
| Pipe | `{name}.pipe.ts` | `validation.pipe.ts` |

### Classes

| Loai | Convention | Vi du |
|---|---|---|
| Entity | `{Name}Entity` | `ProductEntity` |
| Service | `{Names}Service` (plural) | `ProductsService` |
| Controller | `{Names}Controller` | `ProductsController` |
| Module | `{Names}Module` | `ProductsModule` |
| DTO | `Create{Name}Dto`, `Update{Name}Dto` | `CreateProductDto` |

### Database columns

- `snake_case`: `created_at`, `category_id`, `is_active`
- Boolean prefix: `is_` hoac `has_` — `is_active`, `is_featured`, `has_variants`
- FK suffix: `_id` — `category_id`, `user_id`, `tenant_id`

### API Endpoints

- `GET /api/{resources}` — List (paginated)
- `GET /api/{resources}/:id` — Get by ID
- `POST /api/{resources}` — Create
- `PATCH /api/{resources}/:id` — Update
- `DELETE /api/{resources}/:id` — Soft delete

---

## 14. Cach tao module moi (Backend)

### Buoc 1: Entity

```typescript
// backend/src/modules/reviews/entities/review.entity.ts
import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '@/common/entities/base.entity.js';

@Entity('reviews')
export class ReviewEntity extends BaseEntity {
  @Column({ length: 26 })
  product_id: string;

  @Column({ length: 26 })
  user_id: string;

  @Column({ type: 'tinyint' })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment: string | null;

  @Column({ default: false })
  is_approved: boolean;
}
```

### Buoc 2: DTOs

```typescript
// backend/src/modules/reviews/dto/create-review.dto.ts
import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';

export class CreateReviewDto {
  @IsString()
  product_id: string;

  @IsInt()
  @Min(1) @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  comment?: string;
}
```

### Buoc 3: Service

```typescript
// backend/src/modules/reviews/reviews.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BaseService } from '@/common/services/base.service.js';
import { ReviewEntity } from './entities/review.entity.js';

@Injectable()
export class ReviewsService extends BaseService<ReviewEntity> {
  protected searchableFields = ['comment'];

  constructor(
    @InjectRepository(ReviewEntity) repo: Repository<ReviewEntity>,
  ) {
    super(repo, 'Review');
  }
}
```

### Buoc 4: Controller

```typescript
// backend/src/modules/reviews/reviews.controller.ts
import { Controller, Get, Post, Body, Param, Query, Patch, Delete } from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { PaginationDto } from '@/common/dto/pagination.dto.js';
import { CurrentUser } from '@/common/decorators/current-user.decorator.js';
import { Public } from '@/common/decorators/public.decorator.js';
import { Roles } from '@/common/decorators/roles.decorator.js';
import { UserRole } from '@/common/constants/index.js';
import { paginatedResponse } from '@/common/utils/response.js';
import { ICurrentUser } from '@/common/interfaces/index.js';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Public()
  @Get()
  async findAll(@Query() query: PaginationDto) {
    const { items, meta } = await this.service.findAll(query);
    return paginatedResponse(items, meta);
  }

  @Post()
  async create(@Body() dto: CreateReviewDto, @CurrentUser() user: ICurrentUser) {
    return this.service.create({ ...dto, user_id: user.id });
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id/approve')
  async approve(@Param('id') id: string) {
    return this.service.update(id, { is_approved: true } as any);
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.service.softDelete(id);
  }
}
```

### Buoc 5: Module

```typescript
// backend/src/modules/reviews/reviews.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewEntity } from './entities/review.entity.js';
import { ReviewsService } from './reviews.service.js';
import { ReviewsController } from './reviews.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([ReviewEntity])],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
```

### Buoc 6: Import vao AppModule

```typescript
// backend/src/app.module.ts
import { ReviewsModule } from './modules/reviews/reviews.module.js';

@Module({
  imports: [
    // ... other modules
    ReviewsModule,
  ],
})
export class AppModule {}
```

---

# FRONTEND BASE PATTERNS

## 15. API Client

**WHY:** Moi API call can: base URL, auth header, error handling, type safety. `ApiClient` class lam tat ca.

```typescript
// frontend/src/lib/api/client.ts
class ApiClient {
  private baseUrl: string;

  private getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, params, headers = {} } = options;
    const token = this.getToken();
    const reqHeaders = { 'Content-Type': 'application/json', ...headers };
    if (token) reqHeaders['Authorization'] = `Bearer ${token}`;

    const response = await fetch(this.buildUrl(endpoint, params), {
      method, headers: reqHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Loi khong xac dinh' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }
    if (response.status === 204) return undefined as T;
    return response.json();
  }

  // Shorthand methods
  get<T>(endpoint, params?)
  post<T>(endpoint, body?)
  put<T>(endpoint, body?)
  patch<T>(endpoint, body?)
  delete<T>(endpoint)
  upload<T>(endpoint, formData)  // FormData upload, khong set Content-Type
}

export const apiClient = new ApiClient(API_BASE_URL);
```

**Cach dung:**
```typescript
// GET voi query params
const result = await apiClient.get<ApiResponse<Product[]>>('/products', {
  page: 1, limit: 20, search: 'ao thun',
});

// POST
const product = await apiClient.post<ApiResponse<Product>>('/products', {
  name: 'Ao Thun Nam', price: 250000,
});

// Upload file
const formData = new FormData();
formData.append('file', file);
const media = await apiClient.upload<ApiResponse<MediaFile>>('/media/upload', formData);
```

---

## 16. Zustand Stores

**WHY:** Global state don gian, khong can boilerplate nhu Redux. Persist middleware giu data qua page refresh.

### Auth Store

```typescript
// frontend/src/lib/stores/auth-store.ts
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      setAuth: (user, token) => set({ user, token, isAuthenticated: true }),
      updateUser: (userData) => set((state) => ({
        user: state.user ? { ...state.user, ...userData } : null,
      })),
      logout: () => set({ user: null, token: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
      storage: sessionStorage, // Mat khi dong tab
    },
  ),
);
```

**Cach dung:**
```typescript
// Trong component
const { user, isAuthenticated, logout } = useAuthStore();

// Check auth
if (!isAuthenticated) redirect('/login');

// After login
useAuthStore.getState().setAuth(userData, accessToken);
```

### Cart Store

```typescript
// frontend/src/lib/stores/cart-store.ts
export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      promoCode: null,
      discountAmount: 0,

      addItem: (product, variant, quantity = 1) => set((state) => {
        // Tim san pham + variant da co trong gio → tang quantity
        // Chua co → them moi
      }),
      removeItem: (productId, variantId) => ...,
      updateQuantity: (productId, variantId, quantity) => ...,
      clearCart: () => set({ items: [], promoCode: null, discountAmount: 0 }),

      // Computed values
      getSubtotal: () => get().items.reduce((sum, item) =>
        sum + (item.variant?.price ?? item.product.price) * item.quantity, 0),
      getTotal: () => Math.max(0, get().getSubtotal() - get().discountAmount),
      getItemCount: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
    }),
    { name: 'cart-storage' }, // localStorage — giu qua session
  ),
);
```

**Cach dung:**
```typescript
const { items, addItem, getItemCount, getTotal } = useCartStore();

// Them vao gio
addItem(product, selectedVariant, 2);

// Hien thi
<span>Gio hang ({getItemCount()})</span>
<span>Tong: {formatPrice(getTotal())}</span>
```

### Pattern chung tao Zustand store

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware'; // Optional

interface MyState {
  data: DataType[];
  loading: boolean;
  // Actions
  fetchData: () => Promise<void>;
  reset: () => void;
}

export const useMyStore = create<MyState>()((set) => ({
  data: [],
  loading: false,
  fetchData: async () => {
    set({ loading: true });
    const result = await apiClient.get<DataType[]>('/my-endpoint');
    set({ data: result, loading: false });
  },
  reset: () => set({ data: [], loading: false }),
}));
```

---

## 17. Custom Hooks

### useApi — Generic data fetching

```typescript
// frontend/src/lib/hooks/use-api.ts
export function useApi<T>(
  endpoint: string | null,
  params?: Record<string, string | number | boolean | undefined>,
) {
  // state: { data, loading, error }
  // Tu dong fetch khi endpoint thay doi
  // Tra ve { data, loading, error, refetch }
}

export function useMutation<TInput, TOutput>(
  method: 'POST' | 'PUT' | 'PATCH' | 'DELETE',
  endpoint: string,
) {
  // Tra ve { mutate, loading, error }
}
```

**Cach dung:**
```typescript
// GET - tu dong fetch
const { data, loading, error, refetch } = useApi<ApiResponse<Product[]>>(
  '/products', { page: 1, limit: 20 }
);

// Conditional fetch (null = khong fetch)
const { data: profile } = useApi<ApiResponse<User>>(
  isAuthenticated ? '/users/profile' : null
);

// Mutation
const { mutate, loading: saving } = useMutation<CreateProductDto, ApiResponse<Product>>(
  'POST', '/products'
);
const result = await mutate({ name: 'Ao Thun', price: 250000 });
```

### usePagination — Paginated lists

```typescript
// frontend/src/lib/hooks/use-pagination.ts
export function usePagination({ initialPage = 1, initialLimit = 20 } = {}) {
  return {
    page, limit, total, totalPages,
    setPage, setLimit, setTotal,
    nextPage, prevPage,
    offset, // (page - 1) * limit
  };
}
```

**Cach dung:**
```typescript
const pagination = usePagination({ initialLimit: 10 });
const { data } = useApi<ApiResponse<Product[]>>('/products', {
  page: pagination.page,
  limit: pagination.limit,
});

// Khi nhan response
useEffect(() => {
  if (data?.pagination) pagination.setTotal(data.pagination.total);
}, [data]);

// Trong JSX
<Pagination
  currentPage={pagination.page}
  totalPages={pagination.totalPages}
  onPageChange={pagination.setPage}
/>
```

### useFormValidation — Zod + React Hook Form

```typescript
// frontend/src/lib/hooks/use-form-validation.ts
export function useFormValidation<TInput, TOutput>(
  schema: z.ZodType<TOutput, TInput>,
  defaultValues?: DefaultValues<TInput>,
) {
  return {
    register,       // React Hook Form register
    handleSubmit,   // Form submit handler
    errors,         // Validation errors
    isSubmitting,   // Loading state
    isDirty,        // Co thay doi khong
    isValid,        // Form hop le khong
    reset,          // Reset form
    setValue,        // Set gia tri 1 field
    getValues,      // Lay gia tri
    watch,          // Theo doi thay doi
    trigger,        // Trigger validation thu cong
    control,        // Control cho Controller components
    setError,       // Set error thu cong
    clearErrors,    // Xoa errors
  };
}
```

**Cach dung:**
```typescript
import { loginSchema } from '@/lib/validations/auth.schema';

function LoginForm() {
  const { register, handleSubmit, errors, isSubmitting } = useFormValidation(
    loginSchema,
    { email: '', password: '' },
  );

  const onSubmit = handleSubmit(async (data) => {
    await authApi.login(data);
  });

  return (
    <form onSubmit={onSubmit}>
      <FormField label="Email" error={errors.email?.message} required>
        <Input {...register('email')} />
      </FormField>
      <FormField label="Mat khau" error={errors.password?.message} required>
        <Input type="password" {...register('password')} />
      </FormField>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Dang xu ly...' : 'Dang nhap'}
      </Button>
    </form>
  );
}
```

---

## 18. Zod Validation — Vietnamese Error Messages

**WHY:** Error messages hien thi cho user cuoi — phai bang tieng Viet, ro rang.

### Pattern

```typescript
// frontend/src/lib/validations/auth.schema.ts
import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string({ error: 'Vui long nhap ho ten' })
    .min(1, 'Vui long nhap ho ten')
    .min(2, 'Ho ten phai co it nhat 2 ky tu')
    .max(100, 'Ho ten khong duoc vuot qua 100 ky tu'),

  email: z.string({ error: 'Vui long nhap email' })
    .min(1, 'Vui long nhap email')
    .email('Email khong hop le'),

  password: z.string({ error: 'Vui long nhap mat khau' })
    .min(8, 'Mat khau phai co it nhat 8 ky tu')
    .regex(/[A-Z]/, 'Mat khau phai co it nhat 1 chu hoa')
    .regex(/[a-z]/, 'Mat khau phai co it nhat 1 chu thuong')
    .regex(/[0-9]/, 'Mat khau phai co it nhat 1 so'),

  confirmPassword: z.string({ error: 'Vui long xac nhan mat khau' })
    .min(1, 'Vui long xac nhan mat khau'),
}).refine(
  (data) => data.password === data.confirmPassword,
  { message: 'Mat khau xac nhan khong khop', path: ['confirmPassword'] },
);

// Export type tu schema
export type RegisterFormValues = z.infer<typeof registerSchema>;
```

### Vi du tao validation moi

```typescript
// frontend/src/lib/validations/product.schema.ts
export const createProductSchema = z.object({
  name: z.string().min(2, 'Ten phai co it nhat 2 ky tu').max(200),
  price: z.number().min(0, 'Gia phai lon hon hoac bang 0'),
  category_id: z.string().min(1, 'Vui long chon danh muc'),
  description: z.string().max(2000).optional(),
});
```

### Integration voi React Hook Form

```typescript
const form = useFormValidation(createProductSchema, {
  name: '', price: 0, category_id: '',
});
// Zod schema → zodResolver → React Hook Form
// Validation chay khi onBlur (mode: 'onBlur')
```

---

## 19. Component Patterns

### DataTable — Reusable sortable paginated table

```typescript
// frontend/src/components/shared/data-table.tsx
interface DataTableProps<T extends { id: string }> {
  columns: ColumnDef<T>[];      // Dinh nghia cot
  data: T[];                    // Du lieu
  loading?: boolean;            // Skeleton loading
  page?: number;                // Trang hien tai
  totalPages?: number;          // Tong so trang
  onPageChange?: (page: number) => void;
  search?: string;              // Gia tri search
  onSearch?: (search: string) => void;
  sort?: string;                // Sort field
  order?: 'ASC' | 'DESC';      // Sort direction
  onSort?: (sort: string, order: 'ASC' | 'DESC') => void;
  actions?: ActionDef<T>[];     // Row actions (dropdown menu)
  bulkActions?: BulkActionDef[];// Bulk actions (khi chon nhieu row)
}
```

**Cach dung:**
```typescript
const columns: ColumnDef<Product>[] = [
  { key: 'name', header: 'Ten san pham', sortable: true },
  { key: 'price', header: 'Gia', sortable: true,
    render: (row) => formatPrice(row.price) },
  { key: 'is_active', header: 'Trang thai',
    render: (row) => <StatusBadge status={row.is_active ? 'active' : 'inactive'} /> },
];

<DataTable
  columns={columns}
  data={products}
  loading={loading}
  page={pagination.page}
  totalPages={pagination.totalPages}
  onPageChange={pagination.setPage}
  search={search}
  onSearch={setSearch}
  sort={sort}
  order={order}
  onSort={(s, o) => { setSort(s); setOrder(o); }}
  actions={[
    { label: 'Sua', onClick: (row) => router.push(`/admin/products/${row.id}/edit`) },
    { label: 'Xoa', onClick: (row) => setDeleteId(row.id), variant: 'destructive' },
  ]}
  bulkActions={[
    { label: 'Xoa tat ca', onClick: (ids) => handleBulkDelete(ids), variant: 'destructive' },
  ]}
/>
```

### StatCard — Dashboard statistic card

```typescript
// frontend/src/components/shared/stat-card.tsx
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: number;         // % thay doi (+12.5 hoac -3.2)
  trendLabel?: string;    // "So voi thang truoc"
}

<StatCard
  icon={<ShoppingBag className="h-5 w-5" />}
  label="Tong don hang"
  value={formatNumber(stats.totalOrders)}
  trend={12.5}
  trendLabel="So voi thang truoc"
/>
```

### PageHeader — Page title + breadcrumb + actions

```typescript
// frontend/src/components/shared/page-header.tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
}

<PageHeader
  title="San pham"
  description="Quan ly san pham cua ban"
  breadcrumbs={[
    { label: 'Admin', href: '/admin' },
    { label: 'San pham' },
  ]}
  actions={
    <Button onClick={() => router.push('/admin/products/new')}>
      Them san pham
    </Button>
  }
/>
```

### StatusBadge — Auto-colored status badge

```typescript
// frontend/src/components/shared/status-badge.tsx
<StatusBadge status="DELIVERED" label="Da giao" />
// → <span class="bg-green-100 text-green-800">Da giao</span>

<StatusBadge status="CANCELLED" label="Da huy" />
// → <span class="bg-red-100 text-red-800">Da huy</span>
```

### FormField — Label + input + error wrapper

```typescript
// frontend/src/components/shared/form-field.tsx
interface FormFieldProps {
  label?: string;
  error?: string;
  description?: string;
  required?: boolean;
  children: React.ReactNode;
}

<FormField label="Email" error={errors.email?.message} required>
  <Input {...register('email')} />
</FormField>
```

### ConfirmDialog — Delete/action confirmation

```typescript
// frontend/src/components/shared/confirm-dialog.tsx
interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  onConfirm: () => void | Promise<void>;
  variant?: 'danger' | 'warning' | 'info';
  loading?: boolean;
}

<ConfirmDialog
  open={showDelete}
  onOpenChange={setShowDelete}
  title="Xoa san pham?"
  description="Ban co chac chan muon xoa san pham nay? Hanh dong nay khong the hoan tac."
  onConfirm={() => handleDelete(deleteId)}
  variant="danger"
/>
```

---

## 20. Layouts

### 4 layout cua he thong

| Layout | Route group | Mo ta | Thanh phan |
|---|---|---|---|
| **Public** | `(public)/` | Trang cong khai (home, products, articles) | Header + Footer |
| **Auth** | `(auth)/` | Login, register, forgot password | Centered card, minimal |
| **Dashboard** | `(dashboard)/` | User dashboard (profile, orders, wishlist) | Sidebar + content, responsive |
| **Admin** | `admin/` | Admin panel (CRUD, analytics, settings) | Full sidebar + topbar, print-friendly |

### Route group → Layout mapping

```
frontend/src/app/
├── layout.tsx              ← Root layout (global styles, fonts)
├── (public)/
│   ├── layout.tsx          ← Header + Footer
│   ├── page.tsx            ← Home page
│   └── products/
│       └── page.tsx        ← Product listing
├── (auth)/
│   ├── layout.tsx          ← Centered card
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/
│   ├── layout.tsx          ← User sidebar
│   ├── page.tsx            ← Dashboard overview
│   ├── profile/page.tsx
│   └── orders/page.tsx
└── admin/
    ├── layout.tsx          ← Admin sidebar + topbar
    ├── page.tsx            ← Admin dashboard
    ├── products/page.tsx
    └── users/page.tsx
```

---

## 21. Middleware — Route Protection

**WHY:** Bao ve /admin va /dashboard routes phia server — redirect ve login truoc khi render page.

> **Note:** File `middleware.ts` chua duoc tao trong codebase. Day la pattern khuyen dung:

```typescript
// frontend/src/middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const token = request.cookies.get('access_token')?.value;
  const { pathname } = request.nextUrl;

  // Route can auth
  const protectedPaths = ['/admin', '/dashboard', '/profile', '/orders'];
  const isProtected = protectedPaths.some((p) => pathname.startsWith(p));

  if (isProtected && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Da login → khong cho vao trang auth
  const authPaths = ['/login', '/register'];
  if (authPaths.includes(pathname) && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*', '/login', '/register'],
};
```

---

## 22. Format Utils

**WHY:** Format nhat quan cho gia, ngay, so, file size, trang thai — tieng Viet.

```typescript
// frontend/src/lib/utils/format.ts

// Gia tien
formatPrice(250000)          // "250.000 ₫"
formatPrice(1500, 'USD')     // "$1,500"

// Ngay thang
formatDate('2026-04-16')     // "16/04/2026"
formatDateTime('2026-04-16T10:30:00') // "16/04/2026 10:30"

// Thoi gian tuong doi
formatRelativeTime('2026-04-16T10:00:00') // "5 phut truoc"
formatRelativeTime('2026-04-10T10:00:00') // "6 ngay truoc"

// So
formatNumber(1234567)        // "1.2M"
formatNumber(45000)          // "45K"
formatNumber(500)            // "500"

// File size
formatFileSize(1048576)      // "1 MB"
formatFileSize(2048)         // "2 KB"

// Phan tram
formatPercent(12.5)          // "+12.5%"
formatPercent(-3.2)          // "-3.2%"

// Slug
slugify('Ao Thun Nam Dep')   // "ao-thun-nam-dep"

// Truncate
truncate('Mot chuoi rat dai...', 20) // "Mot chuoi rat dai..."

// Trang thai don hang (Viet hoa)
formatOrderStatus('DELIVERED')  // "Da giao"
formatOrderStatus('CANCELLED')  // "Da huy"

// Trang thai thanh toan
formatPaymentStatus('COMPLETED') // "Da thanh toan"

// Tailwind color theo trang thai
statusColor('DELIVERED')  // "bg-green-100 text-green-800"
statusColor('CANCELLED')  // "bg-red-100 text-red-800"
statusColor('PENDING')    // "bg-yellow-100 text-yellow-800"
```

---

## 23. Cach tao page moi (Frontend)

### Vi du: Tao trang danh sach san pham admin

### Buoc 1: Route

Tao file `frontend/src/app/admin/products/page.tsx`

### Buoc 2: Validation (neu can form)

```typescript
// frontend/src/lib/validations/product.schema.ts
import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(2, 'Ten phai co it nhat 2 ky tu'),
  price: z.number().min(0, 'Gia phai lon hon 0'),
  category_id: z.string().min(1, 'Vui long chon danh muc'),
});

export type CreateProductFormValues = z.infer<typeof createProductSchema>;
```

### Buoc 3: Page component

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/lib/hooks/use-api';
import { usePagination } from '@/lib/hooks/use-pagination';
import { useDebounce } from '@/lib/hooks/use-debounce';
import { PageHeader } from '@/components/shared/page-header';
import { DataTable, ColumnDef } from '@/components/shared/data-table';
import { StatusBadge } from '@/components/shared/status-badge';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { formatPrice } from '@/lib/utils/format';
import type { Product, ApiResponse } from '@/lib/types';

export default function AdminProductsPage() {
  const router = useRouter();
  const pagination = usePagination({ initialLimit: 20 });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState<'ASC' | 'DESC'>('DESC');
  const debouncedSearch = useDebounce(search, 300);

  // Fetch data
  const { data, loading } = useApi<ApiResponse<Product[]>>('/products', {
    page: pagination.page,
    limit: pagination.limit,
    search: debouncedSearch,
    sort, order,
  });

  // Update pagination total khi data thay doi
  if (data?.pagination) pagination.setTotal(data.pagination.total);

  // Column definitions
  const columns: ColumnDef<Product>[] = [
    { key: 'name', header: 'Ten san pham', sortable: true },
    { key: 'price', header: 'Gia', sortable: true,
      render: (row) => formatPrice(row.price) },
    { key: 'quantity', header: 'Ton kho', sortable: true },
    { key: 'is_active', header: 'Trang thai',
      render: (row) => (
        <StatusBadge
          status={row.is_active ? 'active' : 'inactive'}
          label={row.is_active ? 'Dang ban' : 'An'}
        />
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="San pham"
        description="Quan ly san pham cua ban"
        breadcrumbs={[
          { label: 'Admin', href: '/admin' },
          { label: 'San pham' },
        ]}
        actions={
          <Button onClick={() => router.push('/admin/products/new')}>
            <Plus className="h-4 w-4 mr-2" />
            Them san pham
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={data?.data || []}
        loading={loading}
        page={pagination.page}
        totalPages={pagination.totalPages}
        onPageChange={pagination.setPage}
        search={search}
        onSearch={setSearch}
        sort={sort}
        order={order}
        onSort={setSort}
        actions={[
          { label: 'Xem chi tiet', onClick: (row) => router.push(`/admin/products/${row.id}`) },
          { label: 'Sua', onClick: (row) => router.push(`/admin/products/${row.id}/edit`) },
          { label: 'Xoa', onClick: (row) => handleDelete(row.id), variant: 'destructive' },
        ]}
      />
    </div>
  );
}
```

### Buoc 4: Form page (create/edit)

```typescript
'use client';

import { useFormValidation } from '@/lib/hooks/use-form-validation';
import { createProductSchema } from '@/lib/validations/product.schema';
import { useMutation } from '@/lib/hooks/use-api';
import { FormField } from '@/components/shared/form-field';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function CreateProductPage() {
  const { register, handleSubmit, errors, isSubmitting } = useFormValidation(
    createProductSchema,
    { name: '', price: 0, category_id: '' },
  );

  const { mutate } = useMutation('POST', '/products');

  const onSubmit = handleSubmit(async (data) => {
    const result = await mutate(data);
    if (result) router.push('/admin/products');
  });

  return (
    <form onSubmit={onSubmit} className="max-w-2xl space-y-6">
      <FormField label="Ten san pham" error={errors.name?.message} required>
        <Input {...register('name')} />
      </FormField>

      <FormField label="Gia" error={errors.price?.message} required>
        <Input type="number" {...register('price', { valueAsNumber: true })} />
      </FormField>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? 'Dang luu...' : 'Tao san pham'}
      </Button>
    </form>
  );
}
```

---

## Tong ket Checklist

### Tao module backend moi:
- [ ] Entity extend `BaseEntity`
- [ ] DTOs voi `class-validator` (tieng Viet messages)
- [ ] Service extend `BaseService`, khai bao `searchableFields`
- [ ] Controller voi dung decorators (`@Public`, `@Roles`, `@CurrentUser`)
- [ ] Module file, import TypeORM entity
- [ ] Import module vao `AppModule`
- [ ] Import dung `.js` extension

### Tao page frontend moi:
- [ ] File trong dung route group (public/auth/dashboard/admin)
- [ ] Zod validation schema (tieng Viet messages)
- [ ] Page component voi `useApi` + `usePagination`
- [ ] DataTable cho list view
- [ ] Form voi `useFormValidation` + `FormField`
- [ ] Import format utils (`formatPrice`, `formatDate`, `statusColor`)
- [ ] `'use client'` directive cho interactive components
