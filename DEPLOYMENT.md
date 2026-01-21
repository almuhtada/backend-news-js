# Deployment Guide - Backend News Express

## Overview

Sistem ini dirancang untuk migrasi dari WordPress ke custom backend + frontend. Ada beberapa skenario deployment:

### Skenario 1: Development Lokal (Sekarang)
- Backend: Express.js (localhost:3001)
- Frontend: Akan dibuat terpisah
- Database: MySQL lokal (MAMP) - `wp397`

### Skenario 2: Production (cPanel)
- Backend: Express.js di cPanel Node.js app
- Frontend: Static files di cPanel
- Database: MySQL di cPanel (dengan data WordPress existing)

---

## 1. Setup Development Lokal

### Prerequisites
- Node.js (v16+)
- MySQL (via MAMP atau standalone)
- Database WordPress existing

### Steps

1. **Clone/Extract project**
```bash
cd /path/to/backend-news-express
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
Edit `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=wp397        # Nama database WordPress Anda
DB_PORT=8889         # Port MAMP MySQL (default 8889) atau 3306 untuk MySQL standalone
JWT_SECRET=ganti_dengan_secret_key_yang_aman
PORT=3001            # Port untuk backend server
```

4. **Test database connection**
```bash
npm start
```

Jika berhasil, Anda akan melihat:
```
Server running on port 3001
✅ Database connected
✅ Database models synced
```

---

## 2. Migrasi Data dari WordPress

### Jika WordPress ada di database lokal yang sama:

```bash
npm run migrate
```

Script akan:
- Membaca data dari tabel WordPress (`wp_posts`, `wp_terms`, dll)
- Membuat tabel baru untuk sistem custom
- Copy semua data (categories, tags, users, posts)

### Jika WordPress ada di server remote/cPanel:

Ada 2 opsi:

#### Opsi A: Export/Import Database

1. **Export data WordPress dari cPanel:**
```bash
# Di cPanel, export database MySQL
phpMyAdmin → Export → Custom → Pilih tabel:
- wp_posts
- wp_terms
- wp_term_taxonomy
- wp_term_relationships
- wp_users
- wp_postmeta
```

2. **Import ke database lokal:**
```sql
-- Buat database temporary untuk WordPress data
CREATE DATABASE wordpress_temp;

-- Import file SQL
mysql -u root -p wordpress_temp < wordpress_export.sql
```

3. **Update migration script:**
Edit `scripts/migrate-from-wordpress.js`, ubah koneksi untuk baca dari `wordpress_temp`:

```javascript
// Di bagian atas file, tambahkan koneksi kedua
const { Sequelize } = require("sequelize");

const wpSequelize = new Sequelize(
  "wordpress_temp",  // Database WordPress
  "root",
  "root",
  {
    host: "localhost",
    port: 8889,
    dialect: "mysql",
    logging: false,
  }
);

// Lalu di setiap query, gunakan wpSequelize.query() untuk query WordPress
```

#### Opsi B: Dump data langsung dari remote MySQL

```bash
# Dump dari remote server
ssh user@your-cpanel-server.com
mysqldump -u dbuser -p dbname wp_posts wp_terms wp_term_taxonomy \
  wp_term_relationships wp_users wp_postmeta > wordpress_data.sql

# Download file
scp user@server:/path/to/wordpress_data.sql ./

# Import lokal
mysql -u root -p wp397 < wordpress_data.sql
```

---

## 3. Deployment ke cPanel

### A. Setup Node.js App di cPanel

1. **Login ke cPanel**
2. **Buka "Setup Node.js App"**
3. **Create Application:**
   - Node.js version: 16.x atau higher
   - Application mode: Production
   - Application root: `/home/username/backend-news`
   - Application URL: `https://yourdomain.com` atau subdomain
   - Application startup file: `app.js`
   - Environment variables:
     ```
     DB_HOST=localhost
     DB_USER=cpanel_db_user
     DB_PASSWORD=your_db_password
     DB_NAME=cpanel_wp_database
     DB_PORT=3306
     JWT_SECRET=your_super_secret_key
     PORT=3001
     ```

4. **Upload files:**
```bash
# Via FTP/File Manager atau rsync
rsync -avz --exclude node_modules --exclude .git \
  ./ username@server:/home/username/backend-news/
```

5. **Install dependencies di cPanel:**
```bash
# SSH ke cPanel
cd ~/backend-news
source ~/nodevenv/backend-news/16/bin/activate
npm install --production
```

6. **Start/Restart application:**
- Di cPanel Node.js App interface, click "Restart"

### B. Configure MySQL di cPanel

1. **Buat database baru untuk sistem custom:**
```sql
CREATE DATABASE cpanel_news_db;
```

2. **Grant permissions:**
```sql
GRANT ALL PRIVILEGES ON cpanel_news_db.* TO 'db_user'@'localhost';
FLUSH PRIVILEGES;
```

3. **Jalankan migration:**
```bash
# SSH ke server
cd ~/backend-news
source ~/nodevenv/backend-news/16/bin/activate
npm run migrate
```

### C. Setup Frontend

Jika menggunakan React/Vue/Next.js:

1. **Build frontend:**
```bash
# Di local development
cd /path/to/frontend
npm run build
```

2. **Upload ke cPanel:**
```bash
# Upload folder build ke public_html
rsync -avz ./build/ username@server:/home/username/public_html/
```

3. **Configure API endpoint:**
```javascript
// Di frontend, set base URL
const API_BASE_URL = "https://yourdomain.com/api";
```

### D. Setup Proxy/Reverse Proxy (Optional)

Jika ingin akses backend via `/api`:

Edit `.htaccess` di `public_html`:
```apache
RewriteEngine On

# Proxy API requests to Node.js
RewriteCond %{REQUEST_URI} ^/api
RewriteRule ^api/(.*)$ http://localhost:3001/api/$1 [P,L]

# Serve frontend for all other routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

---

## 4. Alternatif: Manual Data Entry

Jika migrasi otomatis tidak memungkinkan, Anda bisa:

1. **Buat content manual via API:**
```bash
# Create categories
curl -X POST http://localhost:3001/api/categories \
  -H "Content-Type: application/json" \
  -d '{"name": "Berita", "slug": "berita"}'

# Create posts
curl -X POST http://localhost:3001/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Judul Artikel",
    "content": "Konten artikel...",
    "status": "publish",
    "category_ids": [1]
  }'
```

2. **Import via CSV/SQL:**
Buat script custom untuk import dari CSV atau langsung insert ke database.

---

## 5. Testing

### Local Testing

```bash
# Start server
npm run dev

# Test endpoints
curl http://localhost:3001/api/posts
curl http://localhost:3001/api/categories
```

### Production Testing

```bash
# Test dari remote
curl https://yourdomain.com/api/posts
curl https://yourdomain.com/api/categories
```

---

## 6. Troubleshooting

### Database connection error
```
❌ Database connection error: connect ECONNREFUSED
```

**Solution:**
- Check MySQL service is running
- Verify credentials in `.env`
- Check port (MAMP uses 8889, standard MySQL uses 3306)

### Migration error: Table doesn't exist
```
❌ Error: Table 'wp397.wp_terms' doesn't exist
```

**Solution:**
- Database tidak memiliki tabel WordPress
- Ikuti langkah "Migrasi Data dari WordPress" di atas
- Atau gunakan database yang benar-benar ada WordPress-nya

### Port already in use
```
Error: listen EADDRINUSE :::3001
```

**Solution:**
```bash
# Find process using port
lsof -i :3001

# Kill process
kill -9 <PID>

# Or change PORT in .env
PORT=3002
```

### cPanel Node.js app not starting

**Solution:**
- Check error logs in cPanel Node.js App interface
- Verify all environment variables are set
- Make sure `app.js` exists in application root
- Check Node.js version compatibility

---

## 7. Maintenance

### Update Code

```bash
# Pull changes
git pull origin main

# Install new dependencies
npm install

# Restart server
# Local:
npm run dev

# cPanel:
# Restart via cPanel Node.js App interface
```

### Backup Database

```bash
# Dump database
mysqldump -u user -p database_name > backup_$(date +%Y%m%d).sql

# Restore
mysql -u user -p database_name < backup_20260118.sql
```

### Monitor Logs

```bash
# cPanel
tail -f ~/logs/backend-news/error.log

# Or check in cPanel Node.js App interface
```

---

## 8. Keamanan

### Checklist untuk Production:

- [ ] Ganti `JWT_SECRET` dengan string random yang kuat
- [ ] Setup HTTPS/SSL certificate
- [ ] Enable CORS hanya untuk domain yang diizinkan
- [ ] Implement rate limiting
- [ ] Setup authentication middleware
- [ ] Sanitize user input
- [ ] Update dependencies regularly
- [ ] Setup firewall rules
- [ ] Backup database secara regular

### Update CORS untuk Production

Edit `app.js`:
```javascript
const cors = require("cors");

app.use(cors({
  origin: [
    "https://yourdomain.com",
    "https://www.yourdomain.com"
  ],
  credentials: true
}));
```

---

## Next Steps

1. ✅ Setup database dan backend lokal
2. ⏳ Migrasi data dari WordPress (jika ada)
3. ⏳ Buat frontend (React/Vue/Next.js)
4. ⏳ Test integrasi backend-frontend
5. ⏳ Deploy ke cPanel
6. ⏳ Setup domain dan SSL
7. ⏳ Production testing

Jika ada pertanyaan atau issue, silakan buka issue di repository atau hubungi developer.
