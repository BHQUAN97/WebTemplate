import {
  NotFoundException,
  Logger,
} from '@nestjs/common';
import {
  Repository,
  DeepPartial,
  FindOptionsWhere,
  IsNull,
  SelectQueryBuilder,
} from 'typeorm';
import { BaseEntity } from '../entities/base.entity.js';
import { PaginationDto } from '../dto/pagination.dto.js';
import { PaginationMeta } from '../utils/response.js';

/**
 * Abstract base service providing CRUD operations with pagination and soft delete.
 * All module services should extend this class.
 *
 * @typeParam T - Entity type extending BaseEntity
 *
 * @example
 * ```ts
 * @Injectable()
 * export class UsersService extends BaseService<UserEntity> {
 *   constructor(@InjectRepository(UserEntity) repo: Repository<UserEntity>) {
 *     super(repo, 'User');
 *   }
 *
 *   // Override searchableFields cho search functionality
 *   protected searchableFields: string[] = ['name', 'email'];
 * }
 * ```
 */
export abstract class BaseService<T extends BaseEntity> {
  protected readonly logger: Logger;

  /**
   * Fields to search when `search` query param is provided.
   * Override in child service to enable search.
   */
  protected searchableFields: string[] = [];

  /**
   * Default sort field. Override in child service if needed.
   */
  protected defaultSort = 'created_at';

  constructor(
    protected readonly repository: Repository<T>,
    protected readonly entityName: string,
  ) {
    this.logger = new Logger(`${entityName}Service`);
  }

  /**
   * Find all records with pagination, search, and soft-delete filter.
   *
   * @param options - Pagination and filter options
   * @returns Tuple of [items, pagination metadata]
   */
  async findAll(
    options: PaginationDto,
  ): Promise<{ items: T[]; meta: PaginationMeta }> {
    const { page, limit, search, sort, order } = options;
    const skip = (page - 1) * limit;
    const sortField = sort || this.defaultSort;
    const sortOrder = order || 'DESC';

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
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return { items, meta };
  }

  /**
   * Hook for child services to add custom filters to findAll query.
   * Override this method to add WHERE conditions, JOINs, etc.
   */
  protected applyFilters(
    _qb: SelectQueryBuilder<T>,
    _options: PaginationDto,
  ): void {
    // Override in child service
  }

  /**
   * Helper: Auto-apply tenant filter vao query builder neu entity co cot `tenant_id`.
   * Child service nen goi trong `applyFilters` hoac override `findAll` de dung helper nay.
   *
   * Cach dung:
   * ```ts
   * protected applyFilters(qb: SelectQueryBuilder<T>, options: PaginationDto): void {
   *   this.applyTenantFilter(qb, options.tenantId);
   * }
   * ```
   *
   * TODO: Trong tuong lai co the chuyen BaseService sang REQUEST-scoped de auto-inject
   *       tenantId tu request, khong can subclass tu goi. Hien tai dung helper de tranh
   *       anh huong performance (REQUEST scope = DI container khoi tao moi request).
   *
   * @param qb QueryBuilder da khoi tao voi alias 'entity'
   * @param tenantId ID tenant lay tu request.tenantId (controller truyen xuong)
   * @param alias Alias cua entity trong query (mac dinh 'entity')
   */
  protected applyTenantFilter(
    qb: SelectQueryBuilder<T>,
    tenantId: string | null | undefined,
    alias = 'entity',
  ): void {
    // Bo qua neu khong co tenantId (vi du admin khong co filter)
    if (!tenantId) return;

    // Kiem tra entity co cot tenant_id khong
    const hasTenantColumn = this.repository.metadata.columns.some(
      (c) => c.propertyName === 'tenant_id' || c.databaseName === 'tenant_id',
    );
    if (!hasTenantColumn) return;

    qb.andWhere(`${alias}.tenant_id = :tenantId`, { tenantId });
  }

  /**
   * Helper: Tra ve WHERE clause voi tenant_id cho findOne/findById operations.
   * Tra ve `{}` neu entity khong co cot tenant_id hoac khong co tenantId.
   */
  protected tenantWhere(
    tenantId: string | null | undefined,
  ): Record<string, any> {
    if (!tenantId) return {};
    const hasTenantColumn = this.repository.metadata.columns.some(
      (c) => c.propertyName === 'tenant_id' || c.databaseName === 'tenant_id',
    );
    if (!hasTenantColumn) return {};
    return { tenant_id: tenantId };
  }

  /**
   * Find a single record by ID. Throws NotFoundException if not found.
   *
   * @param id - ULID primary key
   * @returns Found entity
   * @throws NotFoundException
   */
  async findById(id: string): Promise<T> {
    const entity = await this.repository.findOne({
      where: {
        id,
        deleted_at: IsNull(),
      } as FindOptionsWhere<T>,
    });

    if (!entity) {
      throw new NotFoundException(`${this.entityName} with ID "${id}" not found`);
    }

    return entity;
  }

  /**
   * Create and save a new entity.
   *
   * @param data - Entity data (partial)
   * @returns Created entity
   */
  async create(data: DeepPartial<T>): Promise<T> {
    const entity = this.repository.create(data);
    const saved = await this.repository.save(entity);
    this.logger.log(`Created ${this.entityName}: ${(saved as any).id}`);
    return saved;
  }

  /**
   * Partially update an existing entity.
   *
   * @param id - ULID primary key
   * @param data - Fields to update
   * @returns Updated entity
   * @throws NotFoundException
   */
  async update(id: string, data: DeepPartial<T>): Promise<T> {
    const entity = await this.findById(id);
    const merged = this.repository.merge(entity, data);
    const saved = await this.repository.save(merged);
    this.logger.log(`Updated ${this.entityName}: ${id}`);
    return saved;
  }

  /**
   * Soft delete a record (set deleted_at timestamp).
   *
   * @param id - ULID primary key
   * @throws NotFoundException
   */
  async softDelete(id: string): Promise<void> {
    const entity = await this.findById(id);
    await this.repository.softRemove(entity);
    this.logger.log(`Soft deleted ${this.entityName}: ${id}`);
  }

  /**
   * Permanently remove a record from database.
   * Use with caution - data cannot be recovered.
   *
   * @param id - ULID primary key
   * @throws NotFoundException
   */
  async hardDelete(id: string): Promise<void> {
    const entity = await this.findById(id);
    await this.repository.remove(entity);
    this.logger.warn(`Hard deleted ${this.entityName}: ${id}`);
  }

  /**
   * Count active (non-deleted) records.
   */
  async count(): Promise<number> {
    return this.repository.count({
      where: { deleted_at: IsNull() } as FindOptionsWhere<T>,
    });
  }
}
