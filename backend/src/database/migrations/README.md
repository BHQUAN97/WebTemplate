# Database Migrations

Thu muc nay chua cac migration TypeORM. Ngoai ra, mot so index/cau hinh DB can apply thu cong hoac qua migration rieng truoc khi dung tinh nang lien quan.

## FULLTEXT indexes (can cho Search module)

Module `SearchService` (`src/modules/search/search.service.ts`) uu tien MySQL FULLTEXT de tim kiem nhanh tren bang `products`, `articles`, `pages`. Neu index khong ton tai, service se fallback ve `LIKE '%...%'` (cham, khong scale) va log canh bao 1 lan.

Chay cac lenh sau trong MySQL truoc khi dung /api/search o production:

```sql
-- Products: tim kiem tren ten + mo ta + mo ta ngan
ALTER TABLE products
  ADD FULLTEXT INDEX ft_products (name, description, short_description);

-- Articles: title + content + excerpt
ALTER TABLE articles
  ADD FULLTEXT INDEX ft_articles (title, content, excerpt);

-- Pages: title + content
ALTER TABLE pages
  ADD FULLTEXT INDEX ft_pages (title, content);
```

### Kiem tra index da tao

```sql
SHOW INDEX FROM products WHERE Index_type = 'FULLTEXT';
SHOW INDEX FROM articles WHERE Index_type = 'FULLTEXT';
SHOW INDEX FROM pages WHERE Index_type = 'FULLTEXT';
```

### Cau hinh InnoDB min token length (khuyen nghi)

Mac dinh MySQL bo qua tu < 3 ky tu trong FULLTEXT. Neu can tim tu ngan (2 ky tu):

```ini
# my.cnf
[mysqld]
innodb_ft_min_token_size = 2
ft_min_word_len = 2
```

Sau khi doi cau hinh, restart MySQL va rebuild index:

```sql
REPAIR TABLE products QUICK;
REPAIR TABLE articles QUICK;
REPAIR TABLE pages QUICK;
```

### Luu y

- Service tu chuyen sang `BOOLEAN MODE` voi wildcard (`query*`) khi query < 3 ky tu — khong can doi cau hinh min_token_size neu chi thi thoang search tu ngan.
- Cac ky tu dac biet trong BOOLEAN MODE (`+ - < > ( ) ~ * " @`) duoc strip truoc khi query de tranh SQL injection va syntax error.
- Neu dung MariaDB, syntax FULLTEXT tuong duong.

## TypeORM migrations

Tao / chay migration thong thuong qua script:

```bash
./scripts/migrate.sh generate MigrationName
./scripts/migrate.sh run
./scripts/migrate.sh revert
./scripts/migrate.sh seed
```
