# ADR-0003: BaseService Template Method voi hooks (beforeSave/validate/afterSave)

- **Status**: accepted
- **Date**: 2026-02-01
- **Tags**: backend, pattern

## Context

30 module CRUD = 30 lan viet:
- `findAll({page, limit, filter})` — paginate
- `findById(id)` — fetch + 404
- `create(dto)` — validate + save
- `update(id, dto)` — fetch + validate + save
- `softDelete(id)` — mark delete

Neu copy-paste se drift → maintenance nightmare.

## Decision

**BaseService Template Method pattern**:

```typescript
abstract class BaseService<T extends BaseEntity, CreateDto, UpdateDto> {
  constructor(protected repo: Repository<T>) {}

  async findAll(query: QueryDto) {
    // pagination + filter + sort uniform
  }

  async findById(id: string) {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new NotFoundException();
    return entity;
  }

  async create(dto: CreateDto) {
    await this.beforeSave(null, dto);
    await this.validate(dto);
    const entity = this.repo.create(dto);
    const saved = await this.saveData(entity);
    await this.afterSave(saved, dto);
    return saved;
  }

  async update(id: string, dto: UpdateDto) {
    const existing = await this.findById(id);
    await this.beforeSave(existing, dto);
    await this.validate(dto, existing);
    Object.assign(existing, dto);
    const saved = await this.saveData(existing);
    await this.afterSave(saved, dto);
    return saved;
  }

  // Override in child if needed
  protected async beforeSave(existing: T | null, dto: any): Promise<void> {}
  protected async validate(dto: any, existing?: T): Promise<void> {}
  protected async saveData(entity: T): Promise<T> { return this.repo.save(entity); }
  protected async afterSave(saved: T, dto: any): Promise<void> {}
}
```

Child service override hook khi can business logic:

```typescript
class ProductService extends BaseService<Product, CreateProductDto, UpdateProductDto> {
  protected async validate(dto, existing) {
    if (await this.repo.findOne({ where: { slug: dto.slug } })) {
      throw new ConflictException('Slug ton tai');
    }
  }

  protected async afterSave(saved) {
    await this.cache.invalidate(`product:${saved.id}`);
    await this.eventBus.emit('product.created', saved);
  }
}
```

## Rationale

- Template Method = behavior shared, hook customize
- Child chi viet noi dac trung (business rule)
- Test de: mock BaseService, test hook rieng

## Consequences

### Tich cuc
- **70% LOC giam** cho CRUD module
- Consistent pagination, filter format
- Hook → cache invalidate, event emit uniform
- Doi behavior (e.g., default sort) = sua BaseService = apply tat ca

### Tieu cuc
- Debugging sau 2-3 lop (BaseService → child → hook) → stack trace dai
- Over-abstract khi business logic phuc tap (co the ignore hooks, implement rieng)

### Rui ro
- **Hook not called** (child override sai method signature) → mitigation: abstract method + TS strict

## Alternatives Considered

### No base class, copy-paste
- **Nhuoc**: drift, maintenance cost

### Repository + custom service per-module
- **Uu**: flexible
- **Nhuoc**: 30x duplicate code

### CRUD auto-generator (Nestjs CRUD library)
- **Uu**: zero code
- **Nhuoc**: magic, kho customize

## Implementation Notes

- `backend/src/common/services/base.service.ts`
- Doc `docs/BASE-PATTERNS.md` (1,844 lines) giai thich chi tiet

## References

- Related: ADR-0002 (BaseEntity)
