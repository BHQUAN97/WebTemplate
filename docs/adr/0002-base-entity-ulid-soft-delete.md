# ADR-0002: BaseEntity bat buoc — ULID + timestamps + soft delete

- **Status**: accepted
- **Date**: 2026-02-01
- **Tags**: database, pattern

## Context

30 modules = 30+ table. Neu moi table tu dinh nghia primary key + timestamps + delete logic:
- Drift (co table dung uuid, co table auto-increment, co table soft delete, co table hard delete)
- Business logic duplicate (audit code copy-paste)

## Decision

**Tat ca entity bat buoc extend `BaseEntity`**:

```typescript
abstract class BaseEntity {
  @PrimaryColumn('char', { length: 26 })
  id: string;  // ULID

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @DeleteDateColumn()
  deletedAt: Date | null;  // soft delete

  @BeforeInsert()
  generateId() {
    if (!this.id) this.id = ulid();
  }
}
```

### ULID thay vi UUID
- **26 ky tu** base32 (thay vi 36 char UUID hex)
- **Lexicographically sortable** (48 bit timestamp prefix)
- **URL-safe** khong can encode
- Collision xac suat thap

### Soft delete bat buoc
- Query mac dinh exclude `deletedAt IS NOT NULL`
- `.withDeleted()` khi can audit history

## Rationale

- ULID sort-by-id = sort-by-creation → pagination tot hon UUID v4 random
- 26 char ngan, URL dep (`/products/01HX...`)
- Soft delete chuan GDPR/audit requirement
- 1 pattern = khong drift

## Consequences

### Tich cuc
- Consistent across 30 modules
- Audit "ai tao cai gi luc nao" auto-tracked
- Recovery: un-delete = clear `deletedAt`
- Index `createdAt` khong can (ULID co san timestamp)

### Tieu cuc
- Storage lon hon int auto-increment (26 byte vs 4 byte)
- Khong sort theo `id` voi UUID v4 (neu lo chuyen)
- Soft delete co the bi quen filter → leak data "deleted"

### Rui ro
- **Unique constraint loi voi soft delete**: email unique nhung user A delete roi user B tao = conflict voi soft-deleted record → mitigation: partial unique index `WHERE deletedAt IS NULL`

## Alternatives Considered

### UUID v4
- **Nhuoc**: khong sortable, 36 char dai

### Auto-increment int
- **Uu**: 4 byte, nhanh
- **Nhuoc**: enum exposed, de scrape sequential, khong distributed-safe

### UUID v7 (moi)
- **Uu**: sortable nhu ULID
- **Nhuoc**: moi, support chua rong

## Implementation Notes

- `backend/src/common/entities/base.entity.ts`
- Migration co `id CHAR(26) NOT NULL PRIMARY KEY`
- TypeORM global: auto call `.generateId()` tren beforeInsert

## References

- Related: ADR-0003 (BaseService), ADR-0008 (audit log)
