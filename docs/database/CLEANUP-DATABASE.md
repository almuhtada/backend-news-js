# Database Cleanup Guide

Panduan untuk membersihkan database dari tabel-tabel WordPress yang sudah tidak dipakai.

---

## 📋 Langkah-Langkah

### 1. Cek Tabel yang Ada di Database

Jalankan script check untuk melihat semua tabel:

```bash
# Di local atau server
node check-database-tables.js
```

Script akan menampilkan:
- ✅ Custom tables yang aktif digunakan
- 🗑️ WordPress tables yang bisa di-drop
- ⚠️ Tables lain yang perlu dicek manual
- 💾 Ukuran setiap tabel

### 2. Backup Database Dulu!

**WAJIB!** Selalu backup sebelum drop tables:

```bash
# Backup full database
mysqldump -u news -p news_db > backup_before_cleanup_$(date +%Y%m%d).sql

# Atau via SSH ke server
ssh root@api.almuhtada.org
mysqldump -u news -p news_db > /root/backups/backup_$(date +%Y%m%d).sql
```

### 3. Drop WordPress Tables

Ada 2 cara:

#### Opsi A: Manual via MySQL

```bash
# Login ke MySQL
mysql -u news -p news_db

# Drop tables satu-satu
DROP TABLE IF EXISTS wp80posts;
DROP TABLE IF EXISTS wp80postmeta;
DROP TABLE IF EXISTS wp80users;
-- dst...

# Atau drop semua sekaligus
DROP TABLE IF EXISTS wp80posts, wp80postmeta, wp80users, wp80usermeta,
  wp80comments, wp80commentmeta, wp80terms, wp80term_taxonomy,
  wp80term_relationships, wp80termmeta, wp80options, wp80links;
```

#### Opsi B: Gunakan SQL File

```bash
# Edit file drop-wp80-tables.sql sesuai dengan prefix tabel Anda
# Lalu jalankan:
mysql -u news -p news_db < drop-wp80-tables.sql
```

### 4. Verifikasi

Cek lagi tabel yang tersisa:

```bash
node check-database-tables.js

# Atau manual di MySQL
mysql -u news -p news_db -e "SHOW TABLES;"
```

---

## 🗂️ Tabel Yang Digunakan Sistem (JANGAN DI-DROP!)

Tabel-tabel ini **AKTIF** digunakan oleh backend:

1. ✅ `users` - User accounts
2. ✅ `posts` - Articles/posts
3. ✅ `categories` - Post categories
4. ✅ `tags` - Post tags
5. ✅ `post_categories` - Post-Category junction
6. ✅ `post_tags` - Post-Tag junction
7. ✅ `comments` - Post comments
8. ✅ `post_likes` - Post likes/reactions
9. ✅ `media` - Uploaded files
10. ✅ `pages` - Static pages
11. ✅ `page_contents` - Page content blocks
12. ✅ `about_sections` - About page sections
13. ✅ `achievements` - Achievement records
14. ✅ `publications` - Publication records
15. ✅ `notifications` - System notifications
16. ✅ `settings` - System settings

---

## 🗑️ Tabel WordPress Yang Bisa Di-Drop

Tabel dengan prefix `wp80` atau `wp_` adalah tabel WordPress lama:

### WordPress Core Tables:
- `wp80posts` / `wp_posts`
- `wp80postmeta` / `wp_postmeta`
- `wp80users` / `wp_users`
- `wp80usermeta` / `wp_usermeta`
- `wp80comments` / `wp_comments`
- `wp80commentmeta` / `wp_commentmeta`
- `wp80terms` / `wp_terms`
- `wp80term_taxonomy` / `wp_term_taxonomy`
- `wp80term_relationships` / `wp_term_relationships`
- `wp80termmeta` / `wp_termmeta`
- `wp80options` / `wp_options`
- `wp80links` / `wp_links`

### WordPress Plugin Tables:
- `wp80yoast_*` - Yoast SEO plugin
- `wp80redirection_*` - Redirection plugin
- `wp80woocommerce_*` - WooCommerce plugin
- `wp80wpforms_*` - WPForms plugin
- dll.

---

## ⚠️ Peringatan

### Jangan Drop Jika:

1. ❌ Sistem masih menggunakan WordPress
2. ❌ Ada data penting yang belum di-migrate
3. ❌ Belum backup database
4. ❌ Belum verifikasi sistem berjalan normal dengan custom tables

### Boleh Drop Jika:

1. ✅ Sudah migrasi semua data ke custom tables
2. ✅ Sistem backend sudah berjalan normal
3. ✅ Sudah backup database
4. ✅ Sudah test semua fitur (posts, categories, users, dll)

---

## 🔧 Troubleshooting

### Error: Cannot drop table (foreign key constraint)

```sql
-- Disable foreign key checks
SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables
DROP TABLE IF EXISTS wp80posts;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;
```

### Error: Access denied

```bash
# Pastikan user MySQL punya privilege
GRANT ALL PRIVILEGES ON news_db.* TO 'news'@'localhost';
FLUSH PRIVILEGES;
```

### Restore Jika Salah Drop

```bash
# Restore dari backup
mysql -u news -p news_db < backup_before_cleanup_20260130.sql
```

---

## 📊 Monitoring Setelah Cleanup

### Cek Database Size

```sql
SELECT
  TABLE_NAME,
  ROUND(((DATA_LENGTH + INDEX_LENGTH) / 1024 / 1024), 2) AS `Size (MB)`,
  TABLE_ROWS
FROM information_schema.TABLES
WHERE TABLE_SCHEMA = 'news_db'
ORDER BY (DATA_LENGTH + INDEX_LENGTH) DESC;
```

### Optimize Tables

```sql
OPTIMIZE TABLE posts;
OPTIMIZE TABLE users;
OPTIMIZE TABLE categories;
OPTIMIZE TABLE tags;
OPTIMIZE TABLE comments;
OPTIMIZE TABLE media;
```

---

## ✅ Checklist

Sebelum cleanup:
- [ ] Backup database sudah dibuat
- [ ] Sistem backend berjalan normal
- [ ] Test semua endpoint API berhasil
- [ ] Data sudah di-migrate ke custom tables
- [ ] Sudah review daftar tabel yang akan di-drop

Setelah cleanup:
- [ ] Verifikasi sistem masih berjalan normal
- [ ] Test endpoint API masih berhasil
- [ ] Cek ukuran database berkurang
- [ ] Simpan backup untuk jaga-jaga

---

## 📚 Referensi

- `check-database-tables.js` - Script untuk cek tabel
- `drop-wordpress-tables.sql` - Template SQL untuk drop wp_ tables
- `drop-wp80-tables.sql` - Template SQL untuk drop wp80 tables

---

**Happy Cleanup! 🧹**
