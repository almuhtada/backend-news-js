# Al-Muhtada News — Backend API

REST API untuk platform berita **Al-Muhtada** dibangun dengan Express.js, Sequelize ORM, dan MySQL. Dilengkapi AI summarizer (Groq), notifikasi Telegram, dan dokumentasi Swagger.

---

## Tech Stack

| Layer | Library |
|---|---|
| Web Framework | Express 5 |
| ORM | Sequelize 6 + MySQL2 |
| Auth | JWT (jsonwebtoken) + bcryptjs |
| Upload | Multer |
| AI Summary | Groq SDK |
| Notifikasi | Telegram Bot API |
| Dokumentasi | Swagger UI Express |
| Logger | Morgan (HTTP) + utils/logger |

---

## Prasyarat

- Node.js >= 18
- MySQL >= 8
- (Opsional) Docker + Docker Compose

---

## Instalasi

### 1. Clone & Install

```bash
git clone <repo-url>
cd backend-news-js
npm install
```

### 2. Konfigurasi Environment

```bash
cp .env.example .env
```

Isi `.env`:

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=news_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# App
NODE_ENV=development
PORT=3001
BACKEND_URL=http://localhost:3001

# Security — generate dengan: openssl rand -base64 32
JWT_SECRET=your_jwt_secret_here

# AI Summary (opsional) — https://console.groq.com
GROQ_API_KEY=

# Telegram (opsional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_TOPIC_PENULIS=
TELEGRAM_TOPIC_EDITOR=
```

### 3. Jalankan Server

```bash
# Development (auto-reload)
npm run dev

# Production
npm start
```

Server berjalan di `http://localhost:3001`

### 4. Docker (Opsional)

```bash
docker-compose up -d
```

---

## Menjalankan dengan Database Baru

```bash
# Seed data awal
npm run seed

# Seed data About
node scripts/seed/seedAboutData.js

# Seed admin user
node scripts/seed/seedAdminUser.js
```

---

## Struktur Folder

```
backend-news-js/
├── app.js                        # Entry point & bootstrap server
├── config/
│   └── database.js               # Konfigurasi Sequelize
├── controller/
│   ├── auth.js                   # Register, Login
│   ├── postController.js         # CRUD Post + AI Summary + Trending
│   ├── categoryController.js     # CRUD Category (parent-child)
│   ├── tagController.js          # CRUD Tag
│   ├── userController.js         # CRUD User
│   ├── authorController.js       # Profil Author
│   ├── achievementController.js  # Prestasi/Penghargaan
│   ├── publicationController.js  # Publikasi Digital
│   ├── aboutController.js        # Halaman About
│   ├── pageContentController.js  # Konten Halaman Dinamis
│   ├── notificationController.js # Sistem Notifikasi
│   ├── notificationTelegramController.js
│   ├── interactionController.js  # Like & Comment Post
│   ├── settingController.js      # Pengaturan Website
│   └── statsController.js        # Statistik Dashboard
├── middleware/
│   ├── auth.js                   # JWT Authentication
│   └── upload.js                 # Multer (upload gambar, max 5MB)
├── routes/
│   ├── auth.js
│   ├── posts.js
│   ├── categories.js
│   ├── tags.js
│   ├── users.js
│   ├── authors.js
│   ├── achievements.js
│   ├── publications.js
│   ├── about.js
│   ├── pageContents.js
│   ├── notifications.js
│   ├── telegram.js
│   ├── interaction.js
│   ├── comments.js
│   ├── stats.js
│   ├── settings.js
│   └── upload.js
├── schema/
│   ├── index.js                  # Definisi semua relasi antar model
│   ├── user.js
│   ├── post.js
│   ├── category.js
│   ├── tag.js
│   ├── comment.js
│   ├── postCategory.js
│   ├── postTag.js
│   ├── postLike.js
│   ├── notification.js
│   ├── achievement.js
│   ├── publication.js
│   ├── about.js
│   ├── pageContent.js
│   ├── setting.js
│   ├── media.js
│   └── page.js
├── services/
│   ├── summarizer.service.js     # AI auto-summary pakai Groq
│   └── telegram.service.js       # Kirim notifikasi ke Telegram
├── utils/
│   ├── index.js                  # Re-export semua utils
│   ├── response.js               # Standardized API response helpers
│   ├── pagination.js             # Parse & build pagination
│   ├── slug.js                   # Generate slug unik
│   ├── sanitize.js               # Strip HTML, generate excerpt
│   └── logger.js                 # Logger dengan level & timestamp
├── migrations/
│   ├── add-editor-to-posts.js
│   ├── add-rejection-reason.js
│   └── create-post-likes-table.js
├── scripts/
│   ├── database/                 # Cek, cleanup, migrasi tabel
│   ├── deployment/               # Script deploy VPS & Docker
│   ├── maintenance/              # Clean content, sync DB, update URL
│   ├── migration/                # Migrasi dari WordPress
│   └── seed/                     # Seed data awal
├── ai-news/
│   ├── train.py                  # Training model AI lokal
│   ├── infer.py                  # Inferensi model AI lokal
│   └── dataset.jsonl
├── docs/                         # Dokumentasi lengkap per topik
├── config/nginx/                 # Config NGINX
├── config/systemd/               # Config systemd service
├── swagger.js                    # Konfigurasi Swagger
├── ecosystem.config.js           # PM2 config
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Database Models & Relasi

| Model | Keterangan |
|---|---|
| `User` | Penulis & editor berita |
| `Post` | Artikel berita (author + editor) |
| `Category` | Kategori artikel (parent-child) |
| `Tag` | Tag artikel |
| `PostCategory` | Relasi many-to-many Post ↔ Category |
| `PostTag` | Relasi many-to-many Post ↔ Tag |
| `Comment` | Komentar bersarang (threaded) |
| `PostLike` | Like per post |
| `Notification` | Notifikasi aktivitas redaksi |
| `Achievement` | Prestasi/penghargaan |
| `Publication` | Publikasi digital |
| `About` | Seksi halaman About |
| `PageContent` | Konten halaman dinamis |
| `Setting` | Pengaturan global website |
| `Media` | File media/gambar |
| `Page` | Halaman statis (parent-child) |

---

## API Endpoints

Dokumentasi interaktif tersedia di: `http://localhost:3001/api-docs`

### Auth

```
POST   /api/auth/register         Daftar user baru
POST   /api/auth/login            Login, dapat JWT token
GET    /api/auth/profile          Profil user (butuh token)
```

### Posts

```
GET    /api/posts                 Semua post (pagination + filter)
GET    /api/posts/popular         Post terpopuler (berdasarkan views)
GET    /api/posts/recent          Post terbaru
GET    /api/posts/trending        Post trending (engagement score)
GET    /api/posts/:id             Detail post by ID
GET    /api/posts/slug/:slug      Detail post by slug
POST   /api/posts                 Buat post baru (AI summary otomatis)
PUT    /api/posts/:id             Update post
DELETE /api/posts/:id             Hapus post
POST   /api/posts/summarize       Generate ringkasan teks (AI)
```

**Query Parameters `GET /api/posts`:**

| Parameter | Default | Keterangan |
|---|---|---|
| `page` | 1 | Nomor halaman |
| `limit` | 10 | Item per halaman |
| `status` | — | `publish` / `draft` / `pending` |
| `category` | — | Filter by category slug |
| `tag` | — | Filter by tag slug |
| `search` | — | Cari di title & content |
| `sort` | `published_at` | Field untuk sorting |
| `order` | `DESC` | `ASC` atau `DESC` |

### Categories

```
GET    /api/categories            Semua kategori (dengan post_count)
GET    /api/categories/:slug      Detail kategori
GET    /api/categories/:slug/posts Post dalam kategori (pagination)
POST   /api/categories            Buat kategori baru
PUT    /api/categories/:id        Update kategori
DELETE /api/categories/:id        Hapus kategori
```

### Tags

```
GET    /api/tags                  Semua tag
GET    /api/tags/:slug            Detail tag
POST   /api/tags                  Buat tag
PUT    /api/tags/:id              Update tag
DELETE /api/tags/:id              Hapus tag
```

### Users

```
GET    /api/users                 Semua user (pagination + filter role)
GET    /api/users/:id             Detail user
POST   /api/users                 Buat user baru
PUT    /api/users/:id             Update user
DELETE /api/users/:id             Hapus user
```

### Upload

```
POST   /api/upload/image          Upload 1 gambar (field: image)
POST   /api/upload/images         Upload banyak gambar (max 10, field: images)
```

**Contoh:**

```bash
curl -X POST http://localhost:3001/api/upload/image \
  -H "Authorization: Bearer <token>" \
  -F "image=@/path/to/file.jpg"
```

### Lainnya

```
GET/POST/PUT/DELETE  /api/authors
GET/POST/PUT/DELETE  /api/achievements
GET/POST/PUT/DELETE  /api/publications
GET/POST/PUT/DELETE  /api/about
GET/POST/PUT/DELETE  /api/page-contents
GET/POST/PUT/DELETE  /api/notifications
GET/POST/PUT/DELETE  /api/settings
GET/POST/PUT/DELETE  /api/comments
POST/DELETE          /api/posts/:id/like
GET                  /api/stats
POST                 /api/telegram/send
```

---

## Format Response

### Sukses

```json
{
  "success": true,
  "message": "Success",
  "data": { ... }
}
```

### Sukses dengan Pagination

```json
{
  "success": true,
  "data": [ ... ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 10,
    "totalPages": 10,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### Error

```json
{
  "success": false,
  "message": "Pesan error",
  "error": "Detail error (hanya di development)"
}
```

---

## Scripts NPM

```bash
npm run dev              # Jalankan development server (nodemon)
npm start                # Jalankan production server

npm run seed             # Seed data sample
npm run sync:db          # Sinkronisasi struktur database

# Migrasi WordPress
npm run migrate          # Migrasi data dari WordPress
npm run migrate:all      # Migrasi semua data WordPress
npm run migrate:img      # Migrasi gambar ke lokal
npm run migrate:img:dry  # Dry-run migrasi gambar
npm run restore:img      # Restore gambar dari backup
npm run update:img-urls  # Update URL gambar di database
npm run cleanup:wp       # Hapus tabel WordPress lama

# Maintenance
npm run clean:sample     # Hapus data sample
npm run clean:content    # Bersihkan konten WP
npm run fix:img-urls     # Fix URL featured image
npm run jest             # Jalankan unit test
```

---

## Fitur Utama

### AI Auto-Summary
Setiap kali post dibuat, sistem otomatis generate ringkasan menggunakan **Groq API**. Jika Groq tidak tersedia, fallback ke excerpt manual.

```
GROQ_API_KEY= # Isi di .env untuk mengaktifkan fitur ini
```

### Notifikasi Telegram
Setiap aktivitas redaksi (post baru, approve, reject) dikirim ke grup Telegram melalui thread berbeda untuk **Penulis** dan **Editor**.

```
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_TOPIC_PENULIS=
TELEGRAM_TOPIC_EDITOR=
```

### Upload Gambar
- Format: JPEG, JPG, PNG, GIF, WebP
- Ukuran maksimal: **5 MB**
- Disimpan di: `uploads/images/`
- Nama file otomatis di-sanitasi dan di-deduplicate

---

## Troubleshooting

**Database connection error**
- Pastikan MySQL berjalan di port yang benar
- Cek kredensial di `.env`
- Jalankan `node scripts/database/check-database-tables.js` untuk verifikasi

**Port sudah dipakai**
```bash
# Linux/Mac
lsof -ti:3001 | xargs kill -9

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

**Upload gagal**
- Cek permission folder `uploads/`
- Pastikan ukuran file < 5MB
- Pastikan tipe file adalah gambar

**AI summary tidak berfungsi**
- Pastikan `GROQ_API_KEY` sudah diisi di `.env`
- Sistem akan fallback ke excerpt jika API tidak tersedia

---

## Deployment

Lihat panduan lengkap di folder `docs/deployment/`:
- `DEPLOYMENT.md` — panduan umum
- `DOCKER-DEPLOYMENT.md` — deploy dengan Docker
- `NGINX-SETUP.md` — konfigurasi NGINX reverse proxy
- `DEPLOYMENT-CHECKLIST.md` — checklist sebelum go-live
