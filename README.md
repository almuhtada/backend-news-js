# Al-Muhtada News — Backend API

REST API untuk platform berita **Al-Muhtada** dibangun dengan Express.js, Sequelize ORM, dan MySQL. Dilengkapi AI summarizer (Groq), notifikasi Telegram, dan dokumentasi Swagger.

---

## 📖 Dokumentasi Lengkap

Lihat **[DOCS_BE.md](DOCS_BE.md)** untuk dokumentasi detail:
- Struktur folder & arsitektur
- Semua endpoint API
- Sistem keamanan (Spam Shield, File Integrity, Security Alerts)
- Autentikasi JWT + Refresh Token
- Environment variables lengkap
- Swagger, Testing, Deploy PM2

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
| Rate Limit | express-rate-limit |
| Security | Helmet, CORS |

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
JWT_REFRESH_SECRET=your_refresh_secret_here

# AI Summary (opsional) — https://console.groq.com
GROQ_API_KEY=

# Telegram (opsional)
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
TELEGRAM_TOPIC_PENULIS=
TELEGRAM_TOPIC_EDITOR=

# Upload
UPLOAD_PATH=uploads/images
MAX_FILE_SIZE=5242880

# Frontend URLs (untuk CORS)
FRONTEND_URL=http://localhost:5173
DASHBOARD_URL=http://localhost:5174
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
npm run seed:about

# Seed admin user
node scripts/seed/seedAdminUser.js

# Seed page contents
npm run seed:page-contents

# Import profile pages
npm run import:profile-pages
```

---

## Struktur Folder

```
backend-news-js/
├── app.js                        # Compatibility bootstrap -> src/server.js
├── src/                          # Application source (clean runtime layer)
│   ├── server.js                 # Main server bootstrap
│   ├── swagger.js                # Swagger spec & docs config
│   ├── config/
│   │   └── database.js           # Sequelize connection
│   ├── modules/                  # Domain-based module registry (20 modules)
│   ├── controller/               # Request handlers (business orchestration)
│   ├── middleware/               # Auth/upload and request middleware
│   ├── routes/                   # API route registration (20 route files)
│   ├── schema/                   # Sequelize models + associations (21 models)
│   ├── services/                 # External integrations (AI/Telegram)
│   ├── shared/                   # Cross-cutting constants/http/middleware
│   └── utils/                    # Shared helpers (backward-compatible)
├── config/
│   ├── database.js               # Backward-compatible shim -> src/config
│   ├── nginx/                    # NGINX deployment config
│   └── systemd/                  # systemd service config
├── swagger.js                    # Backward-compatible shim -> src/swagger.js
├── migrations/
│   ├── add-editor-to-posts.js
│   ├── add-rejection-reason.js
│   └── create-post-likes-table.js
├── scripts/
│   ├── database/                 # Cek, cleanup, migrasi tabel
│   ├── deployment/               # Script deploy VPS & Docker
│   ├── maintenance/              # Clean content, sync DB, update URL
│   ├── migration/                # Migrasi dari WordPress (7 scripts)
│   └── seed/                     # Seed data awal (5 scripts)
├── ai-news/
│   ├── train.py                  # Training model AI lokal
│   ├── infer.py                  # Inferensi model AI lokal
│   └── dataset.jsonl
├── docs/                         # Dokumentasi lengkap per topik
├── ecosystem.config.js           # PM2 config
├── Dockerfile
├── docker-compose.yml
└── .env.example
```

---

## Database Models & Relasi (21 Models)

| Model | Keterangan |
|---|---|
| `User` | Penulis & editor berita (role: admin, editor, penulis) |
| `Post` | Artikel berita (author + editor, status: draft/pending/publish) |
| `Category` | Kategori artikel (parent-child hierarchy) |
| `Tag` | Tag artikel |
| `PostCategory` | Relasi many-to-many Post ↔ Category |
| `PostTag` | Relasi many-to-many Post ↔ Tag |
| `Comment` | Komentar bersarang (threaded) |
| `PostLike` | Like per post (user + anonymous via identifier) |
| `PostViewLog` | Log view untuk analytics |
| `Notification` | Notifikasi aktivitas redaksi |
| `Achievement` | Prestasi/penghargaan mahasantri |
| `Publication` | Publikasi digital/jurnal |
| `About` | Seksi halaman About |
| `PageContent` | Konten halaman dinamis |
| `Setting` | Pengaturan global website |
| `Media` | File media/gambar |
| `Page` | Halaman statis (parent-child) |
| `Author` | Profil penulis terpisah dari User |
| `RefreshToken` | Token refresh untuk JWT |
| `UserBookmark` | Bookmark artikel user |
| `ArticleActivity` | Activity log untuk moderasi |

---

## API Endpoints

Dokumentasi interaktif tersedia di: `http://localhost:3001/api-docs`

### Auth

```
POST   /api/auth/register         Daftar user baru
POST   /api/auth/login            Login, dapat JWT + Refresh token
POST   /api/auth/refresh          Refresh access token
GET    /api/auth/profile          Profil user (butuh token)
PUT    /api/auth/profile          Update profil
POST   /api/auth/logout           Logout (revoke refresh token)
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
POST   /api/posts/:id/like        Like/unlike post
DELETE /api/posts/:id/like        Hapus like
GET    /api/posts/:id/comments    Komentar post
POST   /api/posts/:id/comments    Tambah komentar
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
GET    /api/categories/tree       Kategori hierarchy tree
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

### Users & Authors

```
GET    /api/users                 Semua user (pagination + filter role)
GET    /api/users/:id             Detail user
POST   /api/users                 Buat user baru
PUT    /api/users/:id             Update user
DELETE /api/users/:id             Hapus user
GET    /api/authors               Semua author
GET    /api/authors/:slug         Detail author + post-nya
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
GET/POST             /api/interactions/stats
GET                  /api/stats
POST                 /api/telegram/send
GET                  /api/home                # Data homepage (featured, trending, latest)
GET                  /api/recommendations     # Rekomendasi artikel
GET                  /api/search              # Pencarian global
GET                  /api/moderation/stats    # Statistik moderasi
POST                 /api/moderation/scan     # Scan spam
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
npm run seed:about       # Seed data About
npm run seed:page-contents # Seed page contents
npm run import:profile-pages # Import profile pages
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
npm run fix:img-urls:dry # Dry-run fix URL

# Testing & Quality
npm run test             # Jalankan test sekali (CI friendly)
npm run test:watch       # Jalankan test mode watch
npm run test:ci          # Test + coverage
npm run lint             # Cek kualitas kode (ESLint)
npm run lint:fix         # Auto-fix issue lint yang aman
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

### Approval Flow
1. Penulis submit berita (status: `draft` / `pending`)
2. Notifikasi masuk ke dashboard editor
3. Editor preview artikel, lalu **Approve** atau **Reject** (dengan alasan)
4. Approve → status berubah ke `publish`, tersedia di frontend
5. Reject → penulis mendapat notifikasi + alasan penolakan

### Upload Gambar
- Format: JPEG, JPG, PNG, GIF, WebP
- Ukuran maksimal: **5 MB**
- Disimpan di: `uploads/images/`
- Nama file otomatis di-sanitasi dan di-deduplicate

### Sistem Keamanan
- **Spam Shield**: Deteksi konten spam otomatis
- **File Integrity**: Monitoring perubahan file kritis
- **Security Alerts**: Notifikasi aktivitas mencurigakan
- **Rate Limiting**: Proteksi endpoint publik

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

### PM2 Production
```bash
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## Integrasi Frontend

| Frontend | URL | Deskripsi |
|---|---|---|
| Public Website | `http://localhost:5173` | `frontend-news-ts` |
| Admin Dashboard | `http://localhost:5174` | `dashboard-news-ts` |

Keduanya menggunakan `VITE_API_URL=http://localhost:3001/api`