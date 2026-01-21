# Migration Guide - WordPress ke Custom Backend

## Overview

Anda sudah export database WordPress dari server dan import ke MySQL lokal (MAMP). Sekarang kita akan migrate data tersebut ke sistem baru.

## Prerequisites

✅ Database WordPress sudah di-import ke MySQL lokal (database: `wp397`)
✅ Backend Express sudah setup
✅ Koneksi database sudah dikonfigurasi di `.env`

## Langkah-langkah Migrasi

### 1. Cek Struktur Database WordPress

Pertama, pastikan tabel WordPress ada di database Anda:

```bash
# Jalankan di terminal (jika punya mysql client)
mysql -h localhost -P 8889 -u root -proot wp397 -e "SHOW TABLES LIKE 'wp_%';"
```

Atau bisa gunakan phpMyAdmin dari MAMP untuk cek tabel-tabel ini:
- `wp_posts` - Artikel/posts
- `wp_terms` - Categories & tags
- `wp_term_taxonomy` - Taxonomy info
- `wp_term_relationships` - Relasi post-category/tag
- `wp_users` - Users/penulis
- `wp_postmeta` - Metadata posts (featured image, dll)

### 2. Sesuaikan Prefix WordPress (jika perlu)

File migration script sudah menggunakan prefix `wp_` secara default. Jika database Anda menggunakan prefix lain (misal `wpdb_`), edit file:

`scripts/migrate-from-wordpress.js` baris ke-15:

```javascript
const WP_PREFIX = "wp_"; // Ganti jika prefix berbeda
```

### 3. Jalankan Migration

```bash
npm run migrate
```

Script akan:
1. ✅ Connect ke database
2. ✅ Baca data categories dari `wp_terms` + `wp_term_taxonomy`
3. ✅ Baca data tags dari `wp_terms` + `wp_term_taxonomy`
4. ✅ Baca data users dari `wp_users`
5. ✅ Baca data posts dari `wp_posts`
6. ✅ Baca featured images dari `wp_postmeta`
7. ✅ Maintain semua relationships

### 4. Verifikasi Hasil Migrasi

Setelah migration selesai, test API:

```bash
# Cek total posts
curl "http://localhost:3001/api/posts?limit=5"

# Cek categories
curl "http://localhost:3001/api/categories"

# Cek single post
curl "http://localhost:3001/api/posts/SLUG_ARTIKEL"
```

## Struktur Data yang Dimigrasikan

### Categories
- ✅ Name, slug, description
- ✅ Parent-child relationship (kategori dengan sub-kategori)
- ✅ WordPress term_id disimpan di field `wp_term_id`

### Tags
- ✅ Name, slug, description
- ✅ WordPress term_id disimpan di field `wp_term_id`

### Posts
- ✅ Title, slug, content, excerpt
- ✅ Status (publish, draft, pending)
- ✅ Published date
- ✅ Author (relasi ke user)
- ✅ Featured image URL
- ✅ Categories (many-to-many)
- ✅ Tags (many-to-many)
- ✅ WordPress post_id disimpan di field `wp_post_id`

### Users
- ✅ Username, email
- ✅ WordPress password hash (preserved)
- ⚠️ **Note**: Password WordPress akan tetap menggunakan hash WordPress. User perlu reset password atau implement WordPress password verification.

## Handling WordPress Password

Ada 2 opsi untuk handle password:

### Opsi 1: Reset Password (Recommended)
Setelah migrasi, minta users untuk reset password via "Forgot Password" feature.

### Opsi 2: Verify WordPress Password
Implement WordPress password verification. Install package:

```bash
npm install wordpress-hash
```

Update `controller/auth.js`:

```javascript
const wpHash = require('wordpress-hash');

// Di login function
const validPassword = wpHash.CheckPassword(password, user.password);
```

## Troubleshooting

### Error: Table doesn't exist

**Problem:**
```
❌ Error: Table 'wp397.wp_posts' doesn't exist
```

**Solution:**
- Database tidak memiliki tabel WordPress
- Pastikan Anda sudah import SQL dump WordPress
- Cek nama database di `.env` sudah benar
- Cek prefix tabel (default: `wp_`)

### Error: Column not found

**Problem:**
```
❌ Error: Unknown column 'wp_posts.post_content'
```

**Solution:**
- Struktur tabel WordPress mungkin berbeda
- Buka `scripts/migrate-from-wordpress.js`
- Sesuaikan nama kolom dengan database Anda

### Data tidak complete

**Problem:**
Beberapa posts tidak ter-migrate atau data hilang.

**Solution:**
1. Check log migration untuk error specific
2. Verify data di WordPress database:
   ```sql
   SELECT COUNT(*) FROM wp_posts WHERE post_type='post';
   SELECT COUNT(*) FROM wp_terms;
   ```
3. Re-run migration dengan logging lebih detail

### Featured Image tidak muncul

**Problem:**
Post ter-migrate tapi featured image NULL

**Solution:**
- WordPress menyimpan featured image di `wp_postmeta` dengan meta_key `_thumbnail_id`
- Script migration sudah handle ini
- Pastikan `wp_postmeta` table ada dan ter-migrate

URL featured image dari WordPress akan preserved, contoh:
```
https://old-wordpress-site.com/wp-content/uploads/2025/12/image.jpg
```

Untuk production, ada 2 opsi:
1. Download semua images dari WordPress dan upload ke server baru
2. Keep URLs pointing to old WordPress (jika masih online)
3. Setup redirect dari old URLs ke new URLs

## Post-Migration Tasks

### 1. Verify Data Integrity

```bash
# Count records
curl "http://localhost:3001/api/posts" | jq '.pagination.total'
curl "http://localhost:3001/api/categories" | jq '.data | length'
```

Compare dengan WordPress:
```sql
SELECT COUNT(*) FROM wp_posts WHERE post_type='post' AND post_status IN ('publish','draft');
SELECT COUNT(*) FROM wp_terms t
  JOIN wp_term_taxonomy tt ON t.term_id = tt.term_id
  WHERE tt.taxonomy='category';
```

### 2. Migrate Images (Optional)

Jika ingin migrate images dari WordPress:

```bash
# Download all images from old WordPress
wget -r -np -nH --cut-dirs=2 -A jpg,jpeg,png,gif,webp \
  https://old-wordpress-site.com/wp-content/uploads/

# Upload ke server baru
rsync -avz ./uploads/ /path/to/new/backend/uploads/images/
```

Lalu update URLs di database:
```sql
UPDATE posts
SET featured_image = REPLACE(
  featured_image,
  'https://old-wordpress-site.com/wp-content/uploads/',
  'https://new-site.com/uploads/images/'
);
```

### 3. Setup Redirects (SEO)

Untuk maintain SEO, setup 301 redirects dari old WordPress URLs ke new URLs:

`.htaccess` di old WordPress:
```apache
# Redirect old post URLs to new system
RedirectMatch 301 ^/([0-9]{4})/([0-9]{2})/([0-9]{2})/(.+)$ https://new-site.com/posts/$4
```

### 4. Update Content Links

Posts mungkin punya internal links ke WordPress URLs. Update dengan:

```sql
UPDATE posts
SET content = REPLACE(
  content,
  'https://old-wordpress-site.com',
  'https://new-site.com'
);
```

## Alternative: Incremental Migration

Jika database besar, bisa migrate per batch:

```javascript
// Edit migrate-from-wordpress.js
// Tambah LIMIT di query posts:

const [wpPosts] = await sequelize.query(`
  SELECT ... FROM wp_posts
  WHERE post_type = 'post'
  LIMIT 100 OFFSET 0  -- Batch pertama
`);
```

Jalankan migration berkali-kali dengan OFFSET yang berbeda.

## Rollback

Jika ingin rollback (hapus data migration):

```sql
-- Truncate tables (hati-hati!)
TRUNCATE TABLE posts;
TRUNCATE TABLE post_categories;
TRUNCATE TABLE post_tags;
TRUNCATE TABLE categories;
TRUNCATE TABLE tags;
TRUNCATE TABLE users;
```

Atau drop semua table dan re-sync:

```javascript
// Di app.js, ubah sementara:
sequelize.sync({ force: true }); // Akan drop & recreate semua table
```

## Next Steps

Setelah migrasi sukses:

1. ✅ Verify data di API endpoints
2. ⏳ Build frontend untuk consume API
3. ⏳ Implement authentication & authorization
4. ⏳ Setup image upload untuk posts baru
5. ⏳ Deploy ke production (cPanel)
6. ⏳ Update DNS & SSL
7. ⏳ Monitor & optimize

## Support

Jika ada issue saat migration:

1. Check log output dari migration script
2. Verify database structure di phpMyAdmin
3. Test manual queries untuk debug
4. Create issue di repository (jika ada)

---

**Important Notes:**

- ⚠️ Backup database sebelum run migration
- ⚠️ Migration script bersifat **additive** (tidak delete data existing)
- ⚠️ Jika run migration 2x, akan create duplicate data (kecuali slug sama)
- ✅ Script menggunakan `findOrCreate` berdasarkan slug untuk avoid duplicates

Good luck! 🚀
