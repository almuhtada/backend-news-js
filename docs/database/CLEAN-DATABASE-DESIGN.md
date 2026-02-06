# Clean Database Design - Struktur Baru

## 📋 Analisis Data WordPress

### Data yang Ada:
1. **Posts (Articles):** 3,831 artikel berita
2. **Pages:** 32 halaman statis
3. **Media/Images:** 3,877 file gambar
4. **Categories:** 14 kategori
5. **Tags:** 4,657 tags
6. **Users:** 15 penulis/admin
7. **Comments:** 1,631 komentar
8. **Menus:** 64 menu items

### Data yang Diabaikan (tidak penting):
- Revisions (4,850) - history revisi
- oembed_cache (6) - cache embed
- elementor_library (4) - template builder
- nav_menu_item (64) - menu (bisa dibuat ulang di frontend)

---

## 🗄️ Struktur Database Baru (Clean & Organized)

### 1. **users** - Tabel Users/Penulis
```sql
id                 INT PRIMARY KEY AUTO_INCREMENT
wp_user_id         BIGINT (reference ke WP)
username           VARCHAR(60) UNIQUE NOT NULL
email              VARCHAR(100) UNIQUE NOT NULL
password           VARCHAR(255) NOT NULL
display_name       VARCHAR(250)
first_name         VARCHAR(100)
last_name          VARCHAR(100)
role               ENUM('administrator', 'editor', 'author', 'contributor', 'subscriber', 'user')
avatar_url         VARCHAR(500)
bio                TEXT
user_url           VARCHAR(100)
user_registered    DATETIME
status             ENUM('active', 'inactive') DEFAULT 'active'
createdAt          DATETIME
updatedAt          DATETIME
```

### 2. **posts** - Tabel Artikel/Berita
```sql
id                 INT PRIMARY KEY AUTO_INCREMENT
wp_post_id         BIGINT (reference ke WP)
title              VARCHAR(500) NOT NULL
slug               VARCHAR(500) UNIQUE NOT NULL
content            LONGTEXT
excerpt            TEXT
author_id          INT (FK -> users.id)
featured_image_id  INT (FK -> media.id)
featured_image_url VARCHAR(500) (untuk compatibility WP)
status             ENUM('publish', 'draft', 'pending', 'private') DEFAULT 'draft'
comment_status     ENUM('open', 'closed') DEFAULT 'open'
published_at       DATETIME
views              INT DEFAULT 0
is_featured        BOOLEAN DEFAULT false
meta_title         VARCHAR(255) (SEO)
meta_description   TEXT (SEO)
createdAt          DATETIME
updatedAt          DATETIME
```

### 3. **pages** - Tabel Halaman Statis
```sql
id                 INT PRIMARY KEY AUTO_INCREMENT
wp_page_id         BIGINT
title              VARCHAR(500) NOT NULL
slug               VARCHAR(500) UNIQUE NOT NULL
content            LONGTEXT
author_id          INT (FK -> users.id)
template           VARCHAR(100) (about, contact, privacy, dll)
parent_id          INT (FK -> pages.id untuk hierarchy)
menu_order         INT DEFAULT 0
status             ENUM('publish', 'draft', 'private') DEFAULT 'draft'
published_at       DATETIME
meta_title         VARCHAR(255)
meta_description   TEXT
createdAt          DATETIME
updatedAt          DATETIME
```

### 4. **media** - Tabel Media/Gambar
```sql
id                 INT PRIMARY KEY AUTO_INCREMENT
wp_attachment_id   BIGINT
filename           VARCHAR(255) NOT NULL
original_filename  VARCHAR(255)
file_path          VARCHAR(500) (path di server baru)
wp_url             VARCHAR(500) (URL asli dari WordPress)
mime_type          VARCHAR(100)
file_size          INT (in bytes)
width              INT
height             INT
alt_text           VARCHAR(255)
caption            TEXT
description        TEXT
uploaded_by        INT (FK -> users.id)
createdAt          DATETIME
updatedAt          DATETIME
```

### 5. **categories** - Tabel Kategori
```sql
id                 INT PRIMARY KEY AUTO_INCREMENT
wp_term_id         BIGINT
name               VARCHAR(200) NOT NULL
slug               VARCHAR(200) UNIQUE NOT NULL
description        TEXT
parent_id          INT (FK -> categories.id)
thumbnail_id       INT (FK -> media.id)
meta_title         VARCHAR(255)
meta_description   TEXT
display_order      INT DEFAULT 0
createdAt          DATETIME
updatedAt          DATETIME
```

### 6. **tags** - Tabel Tags
```sql
id                 INT PRIMARY KEY AUTO_INCREMENT
wp_term_id         BIGINT
name               VARCHAR(200) NOT NULL
slug               VARCHAR(200) UNIQUE NOT NULL
description        TEXT
createdAt          DATETIME
updatedAt          DATETIME
```

### 7. **post_categories** - Relasi Post-Category (Many-to-Many)
```sql
id                 INT PRIMARY KEY AUTO_INCREMENT
post_id            INT (FK -> posts.id) ON DELETE CASCADE
category_id        INT (FK -> categories.id) ON DELETE CASCADE
UNIQUE(post_id, category_id)
```

### 8. **post_tags** - Relasi Post-Tag (Many-to-Many)
```sql
id                 INT PRIMARY KEY AUTO_INCREMENT
post_id            INT (FK -> posts.id) ON DELETE CASCADE
tag_id             INT (FK -> tags.id) ON DELETE CASCADE
UNIQUE(post_id, tag_id)
```

### 9. **comments** - Tabel Komentar
```sql
id                 INT PRIMARY KEY AUTO_INCREMENT
wp_comment_id      BIGINT
post_id            INT (FK -> posts.id) ON DELETE CASCADE
parent_id          INT (FK -> comments.id untuk nested comments)
author_name        VARCHAR(255) NOT NULL
author_email       VARCHAR(100) NOT NULL
author_url         VARCHAR(200)
author_ip          VARCHAR(45)
content            TEXT NOT NULL
status             ENUM('approved', 'pending', 'spam', 'trash') DEFAULT 'pending'
user_id            INT (FK -> users.id jika user login)
createdAt          DATETIME
updatedAt          DATETIME
```

### 10. **menus** - Tabel Menu Navigation (Optional - bisa dibuat manual)
```sql
id                 INT PRIMARY KEY AUTO_INCREMENT
name               VARCHAR(100) NOT NULL
slug               VARCHAR(100) UNIQUE NOT NULL
location           VARCHAR(50) (header, footer, sidebar)
createdAt          DATETIME
updatedAt          DATETIME
```

### 11. **menu_items** - Items dalam Menu
```sql
id                 INT PRIMARY KEY AUTO_INCREMENT
menu_id            INT (FK -> menus.id) ON DELETE CASCADE
parent_id          INT (FK -> menu_items.id)
title              VARCHAR(255) NOT NULL
url                VARCHAR(500)
target             ENUM('_self', '_blank') DEFAULT '_self'
type               ENUM('custom', 'post', 'page', 'category')
object_id          INT (ID dari post/page/category)
css_classes        VARCHAR(255)
menu_order         INT DEFAULT 0
createdAt          DATETIME
updatedAt          DATETIME
```

### 12. **settings** - Tabel Site Settings
```sql
id                 INT PRIMARY KEY AUTO_INCREMENT
option_name        VARCHAR(191) UNIQUE NOT NULL
option_value       LONGTEXT
autoload           BOOLEAN DEFAULT true
createdAt          DATETIME
updatedAt          DATETIME
```

---

## 📊 Estimasi Data

| Tabel | Jumlah Records | Status |
|-------|----------------|--------|
| users | 15 | ✅ Ready |
| posts | 3,831 | ✅ Ready |
| pages | 32 | 🔄 Akan dimigrate |
| media | 3,877 | 🔄 Akan dimigrate |
| categories | 14 | ✅ Ready |
| tags | 4,657 | ✅ Ready |
| comments | 1,631 | 🔄 Optional |
| post_categories | ~5,000+ | ✅ Ready |
| post_tags | ~15,000+ | ✅ Ready |

---

## 🎯 Keuntungan Struktur Baru

### ✅ Organized
- Setiap jenis konten punya tabel sendiri
- Tidak ada data campur-campur seperti WordPress

### ✅ Relational
- Foreign keys jelas
- Cascade delete otomatis
- Data integrity terjaga

### ✅ Performance
- Index optimal pada kolom yang sering di-query
- Tidak ada kolom yang tidak terpakai
- Query lebih cepat

### ✅ Scalable
- Mudah ditambah field baru
- Mudah ditambah tabel baru
- Struktur jelas untuk developer

### ✅ SEO Friendly
- Meta title & description per content
- Slug optimization
- Easy to implement sitemap

---

## 🔄 Migration Plan

### Phase 1 - Core Content (DONE ✅)
- [x] Users
- [x] Posts
- [x] Categories
- [x] Tags
- [x] Relationships

### Phase 2 - Extended Content (TODO)
- [ ] Pages (32 pages)
- [ ] Media (3,877 images)
- [ ] Comments (1,631 comments)

### Phase 3 - Additional Features (TODO)
- [ ] Menus
- [ ] Settings
- [ ] SEO metadata

---

## 💡 Next Steps

1. **Update Models** - Buat model Sequelize lengkap untuk semua tabel
2. **Migration Script** - Update script untuk migrate semua data
3. **API Endpoints** - Buat endpoints untuk Pages, Media, Comments
4. **Admin Dashboard** - Build UI untuk manage semua content
5. **Frontend** - Display semua data dengan baik

---

**Status:** Clean database design ready! 🎉
