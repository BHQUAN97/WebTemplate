# db/changelog — Quy chuẩn Migration (Flyway-style)

Repo **WebTemplate** đang chuyển dần từ **TypeORM migrations** sang cơ chế changelog
chuẩn (giống vietnet, pipsnote, webphoto, fashionecom, lqd). Hai hệ **chạy song song**:
cơ chế này KHÔNG gỡ TypeORM, KHÔNG đổi schema đang có — chỉ chạy các file migration
mới nằm ở đây.

## Cấu trúc thư mục

```
db/changelog/
├── README.md                                # file này
├── _init/                                   # init nền — idempotent, chạy TRƯỚC mọi batch
│   ├── 001__schema_changelog.sql            # bảng theo dõi phiên bản (bắt buộc)
│   └── 002__baseline_webtemplate.sql        # SNAPSHOT idempotent toàn schema hiện tại
└── <version>/                               # mỗi thư mục = 1 release (semantic x.y.z)
    └── NNN__mô_tả.sql                       # file migration mới
```

- Thư mục bắt đầu bằng `_` (vd `_init`) bị bỏ qua khi scan version, nhưng chạy trước.
- Tên version: `x.y.z` (khuyến nghị). Mỗi thư mục = 1 release, tăng dần.
- File: `NNN__mô_tả.sql` (NNN = thứ tự, mô_tả phân tách `_`).

## 3 quy tắc VÀNG — IDEMPOTENT (chạy lại 100 lần không lỗi)

1. **CREATE TABLE**: luôn `CREATE TABLE IF NOT EXISTS ...`.
2. **ALTER TABLE ADD COLUMN / CREATE INDEX**: MySQL 8 KHÔNG có `IF NOT EXISTS` cho
   ADD COLUMN. Phải kiểm tra `information_schema` rồi dùng `PREPARE/EXECUTE`:
   ```sql
   SELECT COUNT(*) INTO @c FROM information_schema.COLUMNS
     WHERE table_schema=DATABASE() AND table_name='users' AND column_name='email';
   SET @s = IF(@c=0, 'ALTER TABLE `users` ADD COLUMN `email` VARCHAR(255) NULL', 'SELECT 1');
   PREPARE stmt FROM @s; EXECUTE stmt; DEALLOCATE PREPARE stmt;
   ```
3. **INSERT dữ liệu**: dùng `INSERT ... ON DUPLICATE KEY UPDATE` hoặc `INSERT IGNORE`
   + UNIQUE key (KHÔNG `INSERT` trần gây duplicate).

KHÔNG BAO GIỜ: sửa file `.sql` đã apply (checksum đổi sẽ bị skip), dùng
`ALTER ADD COLUMN` trần, hay DROP/DELETE destructive không kiểm tra.

## Chạy

```bash
bash scripts/db-changelog.sh
```

Cơ chế: ensure `schema_changelog` → chạy `_init/*.sql` → scan các batch version →
skip file đã apply theo `(version, filename)` → apply + ghi checksum SHA256.
FAIL thì dừng, `exit 1`. Cấu hình qua env: `DB_CONTAINER`, `DB_NAME`, `DB_USER`,
`DB_PASSWORD`, `ENV_FILE`, `CHANGELOG_DIR`.