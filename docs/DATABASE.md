# Database Documentation

## Conventions

### Primary Keys
- All entities use **ULID** (Universally Unique Lexicographically Sortable Identifier)
- Type: `CHAR(26)`, generated via `ulid` package
- Advantages: sortable by time, no sequence conflicts, safe for distributed systems

### Naming
- Table names: `snake_case`, plural (e.g., `users`, `order_items`)
- Column names: `snake_case` (e.g., `created_at`, `is_active`)
- Foreign keys: `{referenced_table_singular}_id` (e.g., `user_id`, `category_id`)
- Indexes: `IDX_{table}_{columns}` (e.g., `IDX_users_email`)
- Unique: `UQ_{table}_{columns}` (e.g., `UQ_users_email`)

### Standard Columns
Every entity inherits from `BaseEntity`:

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | `CHAR(26)` | No | ULID primary key |
| `created_at` | `TIMESTAMP` | No | Auto-set on insert |
| `updated_at` | `TIMESTAMP` | No | Auto-set on update |
| `deleted_at` | `TIMESTAMP` | Yes | Soft delete marker |

### Soft Delete
- All entities support soft delete via `deleted_at` column
- TypeORM `@DeleteDateColumn` handles this automatically
- Queries automatically filter soft-deleted records
- Hard delete only through direct SQL when necessary

### Character Set
- Database: `utf8mb4` with `utf8mb4_unicode_ci` collation
- Supports full Unicode including emoji

## Entity Relationship Diagram

```
┌───────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    tenants    │     │      users       │     │   api_keys      │
│───────────────│     │──────────────────│     │─────────────────│
│ id (PK)      │──┐  │ id (PK)          │──┐  │ id (PK)         │
│ name         │  │  │ name             │  │  │ user_id (FK)    │
│ slug         │  │  │ email (UQ)       │  │  │ key_hash        │
│ domain       │  │  │ password_hash    │  │  │ scopes          │
│ settings     │  └─▶│ tenant_id (FK)   │  │  │ expires_at      │
│ is_active    │     │ role             │  │  └─────────────────┘
└───────┬───────┘     │ is_active        │  │
        │             │ avatar_url       │  │  ┌─────────────────┐
        │             └──────────────────┘  │  │   webhooks      │
        │                                   │  │─────────────────│
┌───────▼───────┐     ┌──────────────────┐  │  │ id (PK)         │
│     plans     │     │  refresh_tokens  │  │  │ user_id (FK)    │
│───────────────│     │──────────────────│  │  │ url             │
│ id (PK)      │     │ id (PK)          │  │  │ events          │
│ name         │     │ user_id (FK)     │◀─┤  │ secret          │
│ price        │     │ token_hash       │  │  │ is_active       │
│ interval     │     │ expires_at       │  │  └─────────────────┘
│ features     │     │ ip_address       │  │
│ is_active    │     │ user_agent       │  │  ┌─────────────────┐
└───────────────┘     └──────────────────┘  │  │ webhook_deliver.│
                                            │  │─────────────────│
┌───────────────┐     ┌──────────────────┐  │  │ id (PK)         │
│  categories   │     │    products      │  │  │ webhook_id (FK) │
│───────────────│     │──────────────────│  │  │ status_code     │
│ id (PK)      │──┐  │ id (PK)          │  │  │ response        │
│ name         │  │  │ name             │  │  └─────────────────┘
│ slug (UQ)    │  │  │ slug (UQ)        │  │
│ parent_id(FK)│◀─┘  │ description      │  │
│ position     │  └──▶│ category_id (FK) │  │
│ image_url    │     │ price            │  │  ┌─────────────────┐
└───────────────┘     │ compare_price    │  │  │   cart          │
                      │ sku (UQ)         │  │  │─────────────────│
                      │ stock            │  │  │ id (PK)         │
                      │ is_featured      │  └─▶│ user_id (FK)    │
                      │ images           │     └────────┬────────┘
                      └──────┬───────────┘              │
                             │                 ┌────────▼────────┐
                    ┌────────▼────────┐        │   cart_items    │
                    │ product_variants│        │─────────────────│
                    │─────────────────│        │ id (PK)         │
                    │ id (PK)         │        │ cart_id (FK)    │
                    │ product_id (FK) │        │ product_id (FK) │
                    │ name            │        │ variant_id (FK) │
                    │ sku             │        │ quantity         │
                    │ price           │        └─────────────────┘
                    │ stock           │
                    └─────────────────┘

┌───────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    orders     │     │   order_items    │     │    payments     │
│───────────────│     │──────────────────│     │─────────────────│
│ id (PK)      │──┐  │ id (PK)          │     │ id (PK)         │
│ order_number  │  └─▶│ order_id (FK)    │     │ order_id (FK)   │
│ user_id (FK) │     │ product_id (FK)  │     │ method          │
│ status       │     │ variant_id (FK)  │     │ amount          │
│ total        │     │ quantity         │     │ status          │
│ shipping_addr│     │ price            │     │ transaction_id  │
│ note         │     │ subtotal         │     │ refunded_amount │
│ promotion_id │     └──────────────────┘     └─────────────────┘
└───────────────┘

┌───────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   reviews     │     │   promotions     │     │   articles      │
│───────────────│     │──────────────────│     │─────────────────│
│ id (PK)      │     │ id (PK)          │     │ id (PK)         │
│ user_id (FK) │     │ code (UQ)        │     │ title           │
│ product_id   │     │ type             │     │ slug (UQ)       │
│ rating       │     │ value            │     │ content         │
│ title        │     │ min_order        │     │ excerpt         │
│ content      │     │ max_discount     │     │ cover_image     │
│ is_approved  │     │ starts_at        │     │ status          │
│ reply        │     │ ends_at          │     │ author_id (FK)  │
└───────────────┘     │ usage_limit      │     │ published_at    │
                      │ used_count       │     └─────────────────┘
                      └──────────────────┘

┌───────────────┐     ┌──────────────────┐     ┌─────────────────┐
│    pages      │     │   navigation     │     │  nav_items      │
│───────────────│     │──────────────────│     │─────────────────│
│ id (PK)      │     │ id (PK)          │──┐  │ id (PK)         │
│ title        │     │ name             │  └─▶│ nav_id (FK)     │
│ slug (UQ)    │     │ location         │     │ label           │
│ content      │     │ is_active        │     │ url             │
│ is_published │     └──────────────────┘     │ parent_id (FK)  │
│ is_homepage  │                              │ position        │
└───────────────┘                              └─────────────────┘

┌───────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  settings     │     │   audit_logs     │     │ notifications   │
│───────────────│     │──────────────────│     │─────────────────│
│ id (PK)      │     │ id (PK)          │     │ id (PK)         │
│ key (UQ)     │     │ user_id (FK)     │     │ user_id (FK)    │
│ value        │     │ action           │     │ type            │
│ is_public    │     │ entity           │     │ title           │
│ group        │     │ entity_id        │     │ message         │
└───────────────┘     │ old_value        │     │ is_read         │
                      │ new_value        │     │ data            │
┌───────────────┐     │ ip_address       │     └─────────────────┘
│   contacts    │     └──────────────────┘
│───────────────│                              ┌─────────────────┐
│ id (PK)      │     ┌──────────────────┐     │  faq_items      │
│ name         │     │  email_templates │     │─────────────────│
│ email        │     │──────────────────│     │ id (PK)         │
│ phone        │     │ id (PK)          │     │ question        │
│ subject      │     │ name (UQ)        │     │ answer          │
│ message      │     │ subject          │     │ category        │
│ status       │     │ html_body        │     │ is_published    │
└───────────────┘     │ variables        │     │ position        │
                      └──────────────────┘     │ helpful_count   │
                                               └─────────────────┘

┌───────────────────┐  ┌──────────────────┐
│ analytics_events  │  │ i18n_translations│
│───────────────────│  │──────────────────│
│ id (PK)          │  │ id (PK)          │
│ type (pageview/  │  │ key              │
│       event)     │  │ locale           │
│ path             │  │ value            │
│ name             │  │ namespace        │
│ properties       │  └──────────────────┘
│ session_id       │
│ user_agent       │  ┌──────────────────┐
│ ip_address       │  │   media_files    │
│ referrer         │  │──────────────────│
└───────────────────┘  │ id (PK)          │
                       │ filename         │
                       │ url              │
                       │ size             │
                       │ mime_type        │
                       │ width            │
                       │ height           │
                       │ folder           │
                       │ uploaded_by (FK) │
                       └──────────────────┘
```

## Migration Workflow

### Generate Migration

When you modify entities, generate a migration:

```bash
cd backend
npm run build
npx typeorm migration:generate src/database/migrations/DescriptiveName -d dist/config/database.config.js
```

### Run Migrations

```bash
# Via script
./scripts/migrate.sh run

# Direct
cd backend && npx typeorm migration:run -d dist/config/database.config.js
```

### Revert Last Migration

```bash
./scripts/migrate.sh revert
```

### View Migration Status

```bash
cd backend && npx typeorm migration:show -d dist/config/database.config.js
```

## Seed Data

### Admin User Seed

Default admin account created by `./scripts/migrate.sh seed`:

| Field | Value |
|-------|-------|
| Email | `admin@webtemplate.local` |
| Password | `Admin@123` |
| Role | `admin` |
| Name | `Administrator` |

### Other Seeds

Seeds are located in `backend/src/database/seeds/`:
- `admin.seed.ts` — Admin user
- Additional seed files can be added and will be auto-discovered

## Backup Procedures

See `scripts/backup.sh` for automated backups.

### Manual Backup

```bash
# Dump via Docker
docker exec wt-mysql mysqldump -uwtuser -pwtpass webtemplate | gzip > backup.sql.gz

# Dump specific tables
docker exec wt-mysql mysqldump -uwtuser -pwtpass webtemplate users products orders | gzip > partial.sql.gz
```

### Restore

```bash
gunzip < backup.sql.gz | docker exec -i wt-mysql mysql -uwtuser -pwtpass webtemplate
```

## Performance Indexes

Key indexes that should exist (auto-created by TypeORM or in migrations):

| Table | Index | Columns | Type |
|-------|-------|---------|------|
| `users` | `UQ_users_email` | `email` | Unique |
| `products` | `UQ_products_slug` | `slug` | Unique |
| `products` | `UQ_products_sku` | `sku` | Unique |
| `products` | `IDX_products_category` | `category_id` | Regular |
| `products` | `IDX_products_featured` | `is_featured` | Regular |
| `categories` | `UQ_categories_slug` | `slug` | Unique |
| `categories` | `IDX_categories_parent` | `parent_id` | Regular |
| `orders` | `IDX_orders_user` | `user_id` | Regular |
| `orders` | `IDX_orders_status` | `status` | Regular |
| `orders` | `UQ_orders_number` | `order_number` | Unique |
| `articles` | `UQ_articles_slug` | `slug` | Unique |
| `articles` | `IDX_articles_status` | `status` | Regular |
| `analytics_events` | `IDX_analytics_created` | `created_at` | Regular |
| `analytics_events` | `IDX_analytics_path` | `path` | Regular |
| `audit_logs` | `IDX_audit_entity` | `entity, entity_id` | Composite |
| `audit_logs` | `IDX_audit_user` | `user_id` | Regular |
| `i18n_translations` | `UQ_i18n_key_locale` | `key, locale` | Unique |
| `settings` | `UQ_settings_key` | `key` | Unique |
