# Migrasi Data WordPress ke VPS

## Langkah-langkah Migrasi

### 1. Persiapan di Local

```bash
# Pastikan .env sudah dikonfigurasi dengan benar
cp .env.example .env
# Edit .env dengan credentials VPS
```

### 2. Upload ke VPS

```bash
# SSH ke VPS
ssh user@your-vps-ip

# Clone atau upload project
cd /var/www
git clone [repository-url] news-backend
cd news-backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
nano .env  # Isi dengan credentials production
```

### 3. Import Database WordPress

```bash
# Login ke MySQL
mysql -u root -p

# Buat database baru
CREATE DATABASE news_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
GRANT ALL PRIVILEGES ON news_db.* TO 'news'@'localhost' IDENTIFIED BY 'password_anda';
FLUSH PRIVILEGES;
EXIT;

# Import SQL WordPress
mysql -u news -p news_db < news_db.sql
```

### 4. Jalankan Migrasi

```bash
# Sync tabel baru (buat tabel Sequelize)
npm run sync:db

# Jalankan migrasi dari WordPress ke tabel baru
npm run migrate:all

# Bersihkan data sample jika ada
npm run clean:sample
```

### 5. Cleanup Tabel WordPress (Optional)

Setelah migrasi selesai, hapus tabel WordPress yang tidak diperlukan:

```bash
node scripts/migration/cleanup-wp-tables.js
```

### 6. Jalankan Server

```bash
# Development
npm run dev

# Production dengan PM2
pm2 start ecosystem.config.js
pm2 save
```

## Verifikasi

```bash
# Test API
curl http://localhost:3001/api/posts
curl http://localhost:3001/api/categories
```
