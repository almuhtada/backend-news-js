# Backend API (backend-news-js)

> REST API untuk portal berita Al-Muhtada. **Node.js + Express + Sequelize (PostgreSQL) + Swagger**. Fitur utama: CRUD berita/kategori/tag/jurnal/prestasi/halaman statis, autentikasi JWT, deteksi spam judi real-time, notifikasi Telegram, monitoring keamanan.

---

## 📦 Tech Stack

| Layer | Library |
|-------|---------|
| Runtime | Node.js 18+ (ESM via `"type": "module"` di package.json) |
| Framework | Express 4 |
| ORM | Sequelize 6 (PostgreSQL) |
| Auth | JWT (jsonwebtoken), bcryptjs, Refresh Token rotation |
| Docs | Swagger UI (`/api-docs`), swagger-jsdoc |
| Validasi | Custom middleware + Sequelize validators |
| Security | Helmet, CORS whitelist, Morgan logger, Rate-limit (manual) |
| External | Telegram Bot API, ip-api.com (geoIP), Groq (AI summary) |

---

## 🗂 Struktur Folder (src)

```
src/
├── config/
│   └── database.js               # Sequelize instance + connection pool
├── controller/                   # Request handlers (tipis, delegasikan ke service)
│   ├── authController.js         # Login, register, profile, refresh
│   ├── postController.js         # CRUD berita + publish/unpublish + featured
│   ├── categoryController.js     # CRUD kategori
│   ├── tagController.js          # CRUD tag + popular tags
│   ├── authorController.js       # Berita per penulis
│   ├── interactionController.js  # Like, comment, spam scan komentar
│   ├── moderationController.js   # Scan manual konten (admin)
│   ├── notificationController.js # CRUD notifikasi + approve/reject
│   ├── notificationTelegramController.js # Kirim test Telegram
│   ├── publicationController.js  # CRUD jurnal/artikel
│   ├── achievementController.js  # CRUD prestasi
│   ├── aboutController.js        # CRUD halaman about
│   ├── statsController.js        # Dashboard stats (engagement, distribusi)
│   ├── uploadController.js       # Upload gambar (multer)
│   └── pageContentController.js  # Konten halaman statis (Griya Quran, dll)
├── middleware/
│   ├── auth.js                   # Verifikasi JWT → req.user
│   ├── spamShield.js             # 🛡 Deteksi spam judi (semua POST/PUT/PATCH)
│   ├── validation.js             # Validasi body/query/params
│   └── upload.js                 # Multer config (image only, max 5MB)
├── routes/                       # Route definitions per modul
│   ├── auth.js
│   ├── posts.js
│   ├── categories.js
│   ├── tags.js
│   ├── authors.js
│   ├── interactions.js
│   ├── moderation.js
│   ├── notifications.js
│   ├── publications.js
│   ├── achievements.js
│   ├── about.js
│   ├── stats.js
│   ├── upload.js
│   └── pageContents.js
├── schema/                       # Sequelize models
│   ├── user.js
│   ├── post.js
│   ├── category.js
│   ├── tag.js
│   ├── postTag.js
│   ├── postCategory.js
│   ├── comment.js
│   ├── like.js
│   ├── refreshToken.js
│   ├── notification.js
│   ├── publication.js
│   ├── achievement.js
│   ├── aboutSection.js
│   └── pageContent.js
├── services/                     # Business logic
│   ├── auth.service.js           # Login, register, token, refresh
│   ├── post.service.js           # CRUD berita + AI summary (Groq)
│   ├── spamDetector.service.js   # Core deteksi keyword + regex + normalize
│   ├── telegram.service.js       # Kirim notifikasi ke Telegram (topic SPAM/PENULIS/EDITOR)
│   ├── summarizer.service.js     # AI ringkas (Groq Llama 3.1 8B)
│   ├── fileIntegrity.service.js  # Hash file kritis + interval 5 menit
│   └── securityAlert.service.js  # Alert: server start, admin login, brute force
├── utils/
│   ├── gamblingKeyword.js        # 435 keyword judi (ID, EN, CN) + word-boundary list
│   ├── logger.js                 # Simple logger dengan level
│   ├── AppError.js               # Custom error class
│   └── helpers.js                # Format date, slug, dll
├── shared/
│   ├── constants/app.js          # APP_NAME, API_VERSION
│   └── middleware/
│       ├── errorHandler.js       # Global error handler
│       └── notFound.js           # 404 handler
├── modules/                      # Auto-register routes
│   └── index.js                  # Import semua route → array untuk server.js
├── scripts/
│   └── test-spam-shield.js       # Test deteksi + kirim Telegram + geo
├── server.js                     # Entry point: middleware stack, routes, Swagger, startup banner
├── swagger.js                    # Swagger config
└── app.js                        # Export app untuk testing
```

---

## 🛡 Sistem Keamanan & Anti-Spam (Utama)

### 1. Spam Shield Middleware (`middleware/spamShield.js`)
- **Aktif di semua `POST/PUT/PATCH`** (kecuali GET)
- Scan **body + query + params** (rekursif, semua tipe data)
- **435 keyword** (Indonesia, English, Mandarin) + **Leetspeak** + **Spasi/Pemisah** + **Regex pola** (slot777, mpo888, shortener link, IP address)
- **GeoIP real-time** → ip-api.com (HTTP, free tier) → negara, kota, ISP, lat/lon, Google Maps link
- **Provider detection** → Telkomsel, XL, Indosat, Telkom, Biznet, Cloud/VPS (AWS/DO), Singapura, VPN/Proxy
- **Action**: **HANYA LAPORKAN** ke Telegram (topic SPAM), **TIDAK BLOKIR** konten
- **Data dikirim**: IP internet, IP device (header `X-Device-IP`), lokasi, provider, Google Maps, User Agent, keyword matched, cuplikan konten (strip HTML, max 500 char)

### 2. File Integrity Monitor (`services/fileIntegrity.service.js`)
- Hash SHA-256 (16 char) **12 file kritis**: `server.js`, `.env`, `spamShield.js`, `auth.service.js`, `authController.js`, `postController.js`, `routes/auth.js`, `routes/posts.js`, `routes/upload.js`, `gamblingKeyword.js`, `spamDetector.service.js`, `config/database.js`
- Baseline di startup → interval **5 menit** scan perubahan
- **MODIFIED / NEW / DELETED** → alert Telegram (topic SPAM)

### 3. Security Alerts (`services/securityAlert.service.js`)
| Alert | Trigger | Data |
|-------|---------|------|
| **Server Start/Restart** | `server.js` listen | Host, Port, Env, Node, Memori |
| **Admin Login** | Login sukses (`auth.service.js`) | User, Role, IP, Device (UA) |
| **Brute Force** | 5× gagal / 10 menit per IP | IP, Count, Identitas yang dicoba |

> Semua alert → **Telegram Topic SPAM** (dari `TELEGRAM_TOPIC_SPAM` di .env), format bersih (HTML, minimal emoji).

### 4. Pembersihan Data Sensitif (Done)
- ❌ `console.log(token)` di login FE → dihapus
- ❌ Log header IP & payload Telegram di server log → dihapus
- ❌ Log Groq API key / summarizer debug → dihapus

---

## 🔐 Autentikasi

| Endpoint | Method | Auth | Deskripsi |
|----------|--------|------|-----------|
| `/api/auth/login` | POST | ❌ | Login → JWT (1h) + Refresh Token (7d) |
| `/api/auth/refresh` | POST | ❌ | Refresh access token |
| `/api/auth/profile` | GET | ✅ Bearer | Profil user login |
| `/api/auth/register` | POST | ❌ | Registrasi user baru (admin only) |

- **Access Token**: 1 jam, payload `{id, email, username, role}`
- **Refresh Token**: 7 hari, disimpan di DB (`refresh_tokens` table), rotasi tiap pakai
- **Role**: `administrator` | `editor` | `penulis` | `user`

---

## 📚 Endpoint Utama (Ringkas)

### Berita (`/api/posts`)
| Method | Path | Auth | Deskripsi |
|--------|------|------|-----------|
| GET | `/` | ❌ | List + filter + pagination + search |
| GET | `/:uuid` | ❌ | Detail berita |
| POST | `/` | ✅ (penulis+) | Buat berita (draft/publish) |
| PUT | `/:uuid` | ✅ (penulis+) | Update berita |
| PATCH | `/:uuid/status` | ✅ (editor+) | Publish/Unpublish/Archive |
| DELETE | `/:uuid` | ✅ (admin) | Hapus berita |
| GET | `/popular` | ❌ | Berita populer (like + view) |
| POST | `/:uuid/like` | ❌ | Like (anonim pakai device fingerprint) |
| POST | `/:uuid/comments` | ❌ | Komentar (scan spam shield) |

### Kategori (`/api/categories`) & Tag (`/api/tags`)
- CRUD standar, `popular` tags untuk UI

### Jurnal (`/api/publications`) & Prestasi (`/api/achievements`)
- CRUD + gambar + publish status

### Halaman Statis (`/api/page-contents`)
- Key: `griya-quran`, `program-pengajar`, `pendaftaran`
- Nested editor (visi/misi, program, halaqah, pengurus, rekening, WA, langkah)

### Notifikasi (`/api/notifications`)
- List + filter + approve/reject (update status)
- Source: spam shield, manual moderation

### Stats (`/api/stats`)
- Dashboard: total berita, view, like, komentar, distribusi kategori, engagement harian

### Upload (`/api/upload`)
- Single/Multiple image → `/uploads` static serve
- Validasi MIME + size (max 5MB)

---

## 🌐 Environment (.env)

```env
# App
APP_NAME=Al-Muhtada Backend
API_VERSION=v1
PORT=3001
NODE_ENV=production

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=almuhtada
DB_USER=postgres
DB_PASS=***
DB_DIALECT=postgres

# JWT
JWT_SECRET=***
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_EXPIRY_DAYS=7

# CORS
CORS_ORIGINS=https://dashboard.almuhtada.org,https://almuhtada.org

# Telegram
TELEGRAM_BOT_TOKEN=***
TELEGRAM_CHAT_ID=-100xxxxxxxxxx
TELEGRAM_TOPIC_PENULIS=1
TELEGRAM_TOPIC_EDITOR=2
TELEGRAM_TOPIC_SPAM=<isi sesuai getUpdates>

# AI Summary (Groq)
GROQ_API_KEY=***
```

---

## 📖 Swagger Docs

- URL: `GET /api-docs` (Swagger UI)
- JSON: `GET /swagger.json`
- Auth: Bearer token di header `Authorization`

---

## 🧪 Testing & Scripts

```bash
npm run dev          # Nodemon + debug banner
npm start            # Production (node src/server.js)
npm run test:spam    # node scripts/test-spam-shield.js
npm run lint         # ESLint
```

**Test Spam Shield** (`scripts/test-spam-shield.js`):
- 33 case keyword (ID/EN/CN, leetspeak, spasi, angka, shortener)
- GeoIP real (IP publik server)
- Escape HTML test
- Kirim Telegram live ke topic SPAM

---

## 🚀 Deploy (PM2)

```bash
pm2 start ecosystem.config.js --env production
pm2 logs
pm2 monit
```

`ecosystem.config.js`:
```js
module.exports = {
  apps: [{
    name: 'almuhtada-api',
    script: 'src/server.js',
    env_production: { NODE_ENV: 'production', PORT: 3001 },
    max_memory_restart: '500M',
    watch: false,
  }]
};
```

---

## 📝 Catatan Penting

1. **Spam Shield tidak blokir** — hanya log & notifikasi. Konten judi tetap masuk DB (status draft/publish sesuai user).
2. **GeoIP pakai HTTP** (ip-api.com free tier). HTTPS = paid.
3. **Device IP** dikirim FE via header `X-Device-IP` (WebRTC). Backend fallback ke `X-Forwarded-For` / `socket.remoteAddress`.
4. **Topic SPAM** (dari `TELEGRAM_TOPIC_SPAM` di .env) adalah **satu-satunya topic** untuk semua alert keamanan + spam.
5. **File Integrity** hanya pantau 12 file; tambah ke `WATCH_TARGETS` jika perlu.
6. **Brute Force** in-memory (Map) → reset saat restart. Untuk production multi-instance, pakai Redis.
7. **AI Summary** pakai Groq (Llama 3.1 8B Instant). Fallback otomatis ke ekstrakt 3 kalimat pertama jika API gagal/key tidak ada.
8. **Refresh Token Rotasi** — tiap refresh revoke token lama, buat baru. DB cleanup expired tokens via `cleanupExpiredTokens()`.