# 💾 Database Setup Guide

Panduan setup database untuk berbagai skenario deployment.

---

## 🐳 Metode 1: Docker Compose (RECOMMENDED)

### ✅ Keuntungan:
- Database **otomatis dibuat**
- Tidak perlu install MySQL manual
- Isolated environment
- Easy backup/restore
- Portable

### 📝 Langkah-langkah:

#### 1. Edit file `.env`

```bash
nano .env
```

Isi dengan konfigurasi ini:

```env
# Database Configuration
DB_HOST=mysql          # JANGAN UBAH! (nama service di docker-compose)
DB_USER=newsuser       # Bisa ganti sesuai selera
DB_PASSWORD=MyStr0ng_P@ssw0rd_2024  # WAJIB ganti!
DB_NAME=news_production              # Bisa ganti sesuai selera
DB_PORT=3306           # JANGAN UBAH!

# Application
NODE_ENV=production
PORT=3001
JWT_SECRET=GENERATE_RANDOM_SECRET_HERE

# API Keys
GROQ_API_KEY=your_groq_api_key
TELEGRAM_BOT_TOKEN=your_telegram_token
TELEGRAM_CHAT_ID=your_chat_id

# Backend URL
BACKEND_URL=https://your-domain.com
```

#### 2. Start Docker Compose

```bash
docker-compose up -d
```

**Yang terjadi:**
1. ✅ MySQL container akan start
2. ✅ Database `news_production` akan dibuat otomatis
3. ✅ User `newsuser` akan dibuat otomatis
4. ✅ Password di-set sesuai `DB_PASSWORD`
5. ✅ Backend akan connect ke MySQL

#### 3. Verify Database Created

```bash
# Masuk ke MySQL container
docker exec -it news-mysql bash

# Login ke MySQL
mysql -u newsuser -p
# Enter password: MyStr0ng_P@ssw0rd_2024

# Cek database
SHOW DATABASES;

# Output:
# +--------------------+
# | Database           |
# +--------------------+
# | news_production    |  ← Database Anda
# | information_schema |
# +--------------------+

# Gunakan database
USE news_production;

# Lihat tables (akan dibuatkan oleh Sequelize)
SHOW TABLES;
```

### 🎯 PENTING untuk Docker:

1. **DB_HOST HARUS `mysql`** (bukan `localhost`!)
   - Ini adalah nama service di `docker-compose.yml`
   - Container backend connect ke container mysql via network

2. **Database dibuat otomatis**
   - Tidak perlu `CREATE DATABASE`
   - Tidak perlu `CREATE USER`
   - Semuanya handled oleh Docker

3. **Data persistence**
   - Data disimpan di Docker volume `mysql_data`
   - Tidak hilang saat restart container
   - Backup dengan script `backup.sh`

---

## 🔧 Metode 2: Manual MySQL Installation (PM2 Alternative)

Jika tidak pakai Docker dan install MySQL manual:

### Ubuntu/Debian:

```bash
# Install MySQL
sudo apt-get update
sudo apt-get install -y mysql-server

# Secure installation
sudo mysql_secure_installation

# Login ke MySQL sebagai root
sudo mysql

# Buat database
CREATE DATABASE news_production;

# Buat user
CREATE USER 'newsuser'@'localhost' IDENTIFIED BY 'MyStr0ng_P@ssw0rd_2024';

# Berikan privileges
GRANT ALL PRIVILEGES ON news_production.* TO 'newsuser'@'localhost';

# Flush privileges
FLUSH PRIVILEGES;

# Exit
EXIT;
```

### AlmaLinux/RHEL:

```bash
# Install MySQL
sudo dnf install -y mysql-server

# Start MySQL
sudo systemctl enable --now mysqld

# Get temporary root password
sudo grep 'temporary password' /var/log/mysqld.log

# Secure installation
sudo mysql_secure_installation

# Login
mysql -u root -p

# Buat database (sama seperti Ubuntu)
CREATE DATABASE news_production;
CREATE USER 'newsuser'@'localhost' IDENTIFIED BY 'MyStr0ng_P@ssw0rd_2024';
GRANT ALL PRIVILEGES ON news_production.* TO 'newsuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### Edit `.env` untuk manual MySQL:

```env
# Database Configuration (Manual MySQL)
DB_HOST=localhost      # ← Beda dari Docker!
DB_USER=newsuser
DB_PASSWORD=MyStr0ng_P@ssw0rd_2024
DB_NAME=news_production
DB_PORT=3306

# Sisanya sama...
```

---

## 🔐 Generate Secure Secrets

### JWT Secret:

```bash
# Generate random JWT secret
openssl rand -base64 32

# Output contoh:
# xK9mP2vR8nL5qW3tY7uB1cD4eF6gH0jI2kM5nO8pQ1rS
```

### Database Password:

```bash
# Generate random password
openssl rand -base64 16

# Atau buat sendiri dengan kriteria:
# - Minimal 12 karakter
# - Kombinasi huruf besar, kecil, angka, simbol
# - Contoh: MyStr0ng_P@ssw0rd_2024!
```

---

## 📊 Perbandingan Metode

| Feature | Docker (Recommended) | Manual MySQL |
|---------|---------------------|--------------|
| Auto-create DB | ✅ Ya | ❌ Harus manual |
| DB_HOST | `mysql` | `localhost` |
| Installation | Easy | Perlu skills |
| Portability | ✅ Tinggi | ❌ Rendah |
| Isolation | ✅ Ya | ❌ Tidak |
| Backup | Script ready | Setup manual |

---

## 🔄 Migration dari Development ke Production

### Jika punya data di development:

#### 1. Backup database development

```bash
# Development (local)
bash backup.sh
# Creates: backups/backup_wp397_20240130_120000.sql.gz
```

#### 2. Copy backup ke VPS

```bash
# Upload backup ke VPS
scp backups/backup_wp397_*.sql.gz root@your-vps:/var/www/news-backend/backups/
```

#### 3. Restore di production

```bash
# SSH ke VPS
ssh root@your-vps
cd /var/www/news-backend

# Start containers (database kosong akan dibuat)
docker-compose up -d

# Wait for MySQL to be ready
sleep 10

# Restore dari backup
bash restore.sh backups/backup_wp397_20240130_120000.sql.gz
```

---

## 🧪 Testing Database Connection

### Test connection dari backend:

```bash
# Jika pakai Docker
docker exec -it news-backend node -e "
const mysql = require('mysql2');
const conn = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});
conn.connect(err => {
  if (err) {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Database connected successfully!');
  conn.end();
});
"
```

### Test dari MySQL client:

```bash
# Docker
docker exec -it news-mysql mysql -u newsuser -p news_production

# Manual
mysql -h localhost -u newsuser -p news_production
```

---

## 🔍 Troubleshooting

### Error: Access denied for user

**Problem:** Password salah atau user tidak ada

**Solution:**
```bash
# Docker - check environment variables
docker exec news-mysql printenv | grep DB

# Atau reset password
docker exec -it news-mysql mysql -u root -p${DB_PASSWORD}
ALTER USER 'newsuser'@'%' IDENTIFIED BY 'new_password';
FLUSH PRIVILEGES;
```

### Error: Unknown database

**Problem:** Database belum dibuat

**Solution Docker:**
```bash
# Recreate containers (akan create database baru)
docker-compose down
docker-compose up -d
```

**Solution Manual:**
```bash
mysql -u root -p
CREATE DATABASE news_production;
```

### Error: Can't connect to MySQL server

**Problem:** MySQL belum running atau wrong host

**Solution Docker:**
```bash
# Check MySQL container running
docker ps | grep mysql

# Check logs
docker-compose logs mysql

# Restart
docker-compose restart mysql
```

**Solution Manual:**
```bash
# Check MySQL status
systemctl status mysql

# Start MySQL
systemctl start mysql
```

### DB_HOST wrong in .env

**Docker:** HARUS `mysql` (bukan localhost)
**Manual:** HARUS `localhost` (atau IP server)

---

## 📝 Quick Reference

### Docker Compose:
```env
DB_HOST=mysql          # Service name
DB_USER=newsuser       # Your choice
DB_PASSWORD=STRONG_PWD # Generate secure
DB_NAME=news_db        # Your choice
```

### Manual MySQL:
```env
DB_HOST=localhost      # Or server IP
DB_USER=newsuser
DB_PASSWORD=STRONG_PWD
DB_NAME=news_db
```

### Commands:
```bash
# Docker - create database automatically
docker-compose up -d

# Manual - create database
mysql -u root -p
CREATE DATABASE news_db;

# Test connection
docker exec -it news-mysql mysql -u newsuser -p

# Backup
bash backup.sh

# Restore
bash restore.sh latest
```

---

**Recommendation:** Gunakan **Docker Compose** untuk deployment! Database setup otomatis dan lebih mudah di-manage. 🚀
