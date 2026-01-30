# 🚀 Docker Deployment Guide - News Backend

Panduan lengkap untuk deploy aplikasi News Backend menggunakan Docker dan PM2 ke VPS.

## 📋 Daftar Isi

1. [Prerequisites](#prerequisites)
2. [Local Development dengan Docker](#local-development)
3. [Deploy ke VPS (First Time)](#deploy-vps)
4. [Update/Redeploy](#update-redeploy)
5. [Backup & Restore](#backup-restore)
6. [Emergency Recovery](#emergency-recovery)
7. [PM2 Alternative](#pm2-alternative)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Untuk Development Lokal:
- Docker & Docker Compose
- Git

### Untuk VPS:
- VPS dengan minimal 1GB RAM
- Ubuntu 20.04+ / Debian 11+
- Root atau sudo access
- Domain (opsional, tapi recommended)

---

## 🏠 Local Development dengan Docker

### 1. Setup Awal

```bash
# Clone repository
git clone <your-repo-url>
cd backend-news-express

# Copy environment file
cp .env.example .env

# Edit .env sesuai kebutuhan
nano .env
```

### 2. Start Development

```bash
# Build dan start containers
docker-compose up -d

# Lihat logs
docker-compose logs -f

# Stop containers
docker-compose down
```

### 3. Akses Aplikasi

- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health
- MySQL: localhost:3306

### 4. Useful Commands

```bash
# Restart containers
docker-compose restart

# Rebuild containers
docker-compose up -d --build

# Lihat status
docker-compose ps

# Masuk ke container
docker exec -it news-backend sh
docker exec -it news-mysql bash

# Lihat logs specific service
docker-compose logs -f backend
docker-compose logs -f mysql
```

---

## 🌐 Deploy ke VPS (First Time)

### Persiapan VPS

#### 1. Setup SSH Key

```bash
# Generate SSH key (jika belum punya)
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"

# Copy public key ke VPS
ssh-copy-id root@your-vps-ip
```

#### 2. Edit Konfigurasi Deploy

Edit file `deploy-vps.sh`:

```bash
# Ubah konfigurasi ini
VPS_USER="root"              # atau user lain dengan sudo access
VPS_HOST="123.456.789.0"     # IP VPS Anda
VPS_PORT="22"                # SSH port
APP_DIR="/var/www/news-backend"
```

#### 3. Jalankan Deployment Script

```bash
# Make script executable
chmod +x deploy-vps.sh

# Deploy ke VPS
bash deploy-vps.sh
```

Script ini akan:
- Install Docker & Docker Compose
- Install Node.js & PM2
- Setup directory structure
- Upload project files
- Create .env template

#### 4. Konfigurasi di VPS

```bash
# SSH ke VPS
ssh root@your-vps-ip

# Masuk ke directory aplikasi
cd /var/www/news-backend

# Edit .env dengan konfigurasi production
nano .env
```

**PENTING**: Update nilai-nilai ini di `.env`:

```env
# Database
DB_HOST=mysql
DB_USER=newsuser
DB_PASSWORD=GANTI_PASSWORD_YANG_KUAT
DB_NAME=news_db
DB_PORT=3306

# JWT
JWT_SECRET=GANTI_DENGAN_SECRET_KEY_YANG_KUAT

# API Keys
GROQ_API_KEY=your_actual_groq_api_key
TELEGRAM_BOT_TOKEN=your_actual_telegram_token

# Backend URL
BACKEND_URL=https://your-domain.com  # atau http://your-vps-ip:3001

# Environment
NODE_ENV=production
PORT=3001
```

#### 5. Start Aplikasi

```bash
# Start dengan Docker
docker-compose up -d

# Cek status
docker-compose ps

# Lihat logs
docker-compose logs -f
```

#### 6. Setup Firewall (Recommended)

```bash
# Allow SSH, HTTP, HTTPS, dan Port aplikasi
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 3001/tcp
ufw enable
```

#### 7. Setup Nginx Reverse Proxy (Optional tapi Recommended)

```bash
# Install nginx
apt-get install -y nginx

# Create nginx config
cat > /etc/nginx/sites-available/news-backend << 'EOF'
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Enable site
ln -s /etc/nginx/sites-available/news-backend /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

#### 8. Setup SSL dengan Let's Encrypt (Recommended)

```bash
# Install certbot
apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate
certbot --nginx -d your-domain.com

# Auto-renewal sudah disetup otomatis oleh certbot
```

---

## 🔄 Update/Redeploy

### Update dari Local ke VPS

```bash
# Di local machine
rsync -avz --exclude 'node_modules' \
           --exclude '.git' \
           --exclude 'uploads/*' \
           --exclude 'logs/*' \
           -e ssh \
           ./ root@your-vps-ip:/var/www/news-backend/

# SSH ke VPS
ssh root@your-vps-ip

# Rebuild dan restart
cd /var/www/news-backend
docker-compose down
docker-compose up -d --build
```

### Update di VPS Langsung

```bash
# SSH ke VPS
ssh root@your-vps-ip
cd /var/www/news-backend

# Pull latest code (jika menggunakan git)
git pull origin main

# Rebuild dan restart
docker-compose down
docker-compose up -d --build
```

---

## 💾 Backup & Restore

### Backup Database

```bash
# Make script executable (first time only)
chmod +x backup.sh

# Run backup
bash backup.sh
```

Backup akan disimpan di folder `backups/` dengan format:
- `backup_DBNAME_YYYYMMDD_HHMMSS.sql.gz`
- `latest.sql.gz` (symlink ke backup terakhir)

### Automatic Backup dengan Cron

```bash
# Edit crontab
crontab -e

# Tambahkan untuk backup setiap hari jam 2 pagi
0 2 * * * cd /var/www/news-backend && bash backup.sh >> logs/backup.log 2>&1

# Backup setiap 6 jam
0 */6 * * * cd /var/www/news-backend && bash backup.sh >> logs/backup.log 2>&1
```

### Restore Database

```bash
# Make script executable (first time only)
chmod +x restore.sh

# Restore dari backup terakhir
bash restore.sh latest

# Restore dari file spesifik
bash restore.sh backups/backup_news_db_20240130_120000.sql.gz

# Interactive mode
bash restore.sh
```

### Download Backup dari VPS

```bash
# Download backup terakhir
scp root@your-vps-ip:/var/www/news-backend/backups/latest.sql.gz ./

# Download semua backups
scp -r root@your-vps-ip:/var/www/news-backend/backups ./
```

---

## 🚑 Emergency Recovery

Jika server crash atau terjadi masalah, gunakan quick-start script:

```bash
# Make script executable
chmod +x quick-start.sh

# Run quick start
bash quick-start.sh
```

Script ini akan memberikan 3 opsi:
1. **Docker** (Recommended) - Start dengan Docker Compose
2. **PM2** - Start dengan PM2 process manager
3. **Node.js** - Start langsung dengan Node (testing only)

### Recovery Steps:

1. **Cek .env file**
   ```bash
   # Pastikan .env exists dan benar
   cat .env
   ```

2. **Restore dari backup jika perlu**
   ```bash
   bash restore.sh latest
   ```

3. **Start aplikasi**
   ```bash
   bash quick-start.sh
   ```

---

## 🔧 PM2 Alternative

Jika tidak mau pakai Docker, bisa pakai PM2 untuk production:

### Setup PM2

```bash
# Install dependencies
npm install

# Install PM2 global
npm install -g pm2

# Start dengan PM2
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup systemd
# Copy-paste command yang muncul dan jalankan
```

### PM2 Commands

```bash
# View logs
pm2 logs news-backend

# Monitor
pm2 monit

# Restart
pm2 restart news-backend

# Stop
pm2 stop news-backend

# Delete
pm2 delete news-backend

# List all processes
pm2 list

# Show process details
pm2 show news-backend
```

### PM2 dengan Database Terpisah

Jika pakai PM2, Anda perlu install MySQL terpisah:

```bash
# Install MySQL
apt-get install -y mysql-server

# Secure installation
mysql_secure_installation

# Create database dan user
mysql -u root -p

CREATE DATABASE news_db;
CREATE USER 'newsuser'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON news_db.* TO 'newsuser'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

Update `.env`:
```env
DB_HOST=localhost
DB_USER=newsuser
DB_PASSWORD=your_password
DB_NAME=news_db
DB_PORT=3306
```

---

## 🔍 Troubleshooting

### Container Tidak Start

```bash
# Cek logs
docker-compose logs

# Cek logs spesifik service
docker-compose logs backend
docker-compose logs mysql

# Restart containers
docker-compose restart

# Rebuild dari scratch
docker-compose down -v
docker-compose up -d --build
```

### Database Connection Error

```bash
# Cek MySQL container running
docker ps | grep mysql

# Cek MySQL logs
docker-compose logs mysql

# Test connection dari backend container
docker exec -it news-backend sh
nc -zv mysql 3306

# Restart MySQL
docker-compose restart mysql
```

### Port Sudah Digunakan

```bash
# Cek port yang digunakan
lsof -i :3001
lsof -i :3306

# Kill process yang menggunakan port
kill -9 <PID>

# Atau ubah port di .env
PORT=3002
```

### Permission Issues

```bash
# Fix permissions untuk uploads dan logs
chmod -R 755 uploads
chmod -R 755 logs
chmod -R 755 backups

# Jika di Docker
docker exec -it news-backend sh -c "chmod -R 755 /app/uploads"
```

### Out of Memory

```bash
# Cek memory usage
docker stats

# Increase memory limit di docker-compose.yml
services:
  backend:
    mem_limit: 512m

  mysql:
    mem_limit: 512m
```

### SSL Certificate Issues

```bash
# Renew SSL certificate
certbot renew

# Force renew
certbot renew --force-renewal

# Test renewal
certbot renew --dry-run
```

### PM2 Process Crash

```bash
# Cek logs
pm2 logs news-backend --lines 100

# Cek error logs
pm2 logs news-backend --err

# Flush logs
pm2 flush

# Restart dengan increased memory
pm2 start ecosystem.config.js --env production --max-memory-restart 500M
```

---

## 📊 Monitoring

### Health Check Endpoint

```bash
# Cek health
curl http://localhost:3001/health

# Expected response:
# {"status":"ok","timestamp":"...","uptime":123}
```

### Docker Stats

```bash
# Real-time stats
docker stats

# Container details
docker inspect news-backend
docker inspect news-mysql
```

### Log Monitoring

```bash
# Follow logs
docker-compose logs -f

# Last 100 lines
docker-compose logs --tail=100

# Specific service
docker-compose logs -f backend
```

---

## 🎯 Best Practices

1. **Selalu backup sebelum update**
   ```bash
   bash backup.sh
   ```

2. **Gunakan environment variables untuk secrets**
   - Jangan commit .env ke git
   - Gunakan .env.example sebagai template

3. **Setup monitoring**
   - Health check endpoint
   - Log aggregation
   - Uptime monitoring (UptimeRobot, etc)

4. **Regular backups**
   - Setup cron untuk automatic backup
   - Keep multiple backup copies
   - Test restore process regularly

5. **Security**
   - Update packages regularly
   - Use strong passwords
   - Enable firewall
   - Use SSL/HTTPS
   - Restrict database access

6. **Performance**
   - Monitor resource usage
   - Optimize database queries
   - Use caching where appropriate
   - Enable compression

---

## 📞 Support

Jika mengalami masalah:

1. Cek logs terlebih dahulu
2. Lihat troubleshooting guide di atas
3. Cek dokumentasi Docker dan PM2
4. Contact admin/developer

---

## 📝 Checklist Deploy Production

- [ ] VPS sudah ready (min 1GB RAM)
- [ ] Domain sudah pointing ke VPS (optional)
- [ ] SSH key sudah di-setup
- [ ] Docker & Docker Compose terinstall
- [ ] .env sudah dikonfigurasi dengan benar
- [ ] Database credentials sudah strong password
- [ ] JWT secret sudah di-generate
- [ ] API keys sudah valid
- [ ] Firewall sudah dikonfigurasi
- [ ] Nginx reverse proxy sudah setup (optional)
- [ ] SSL certificate sudah terinstall (optional)
- [ ] Automatic backup sudah di-setup (cron)
- [ ] Health check endpoint sudah ditest
- [ ] Monitoring sudah di-setup
- [ ] Emergency recovery plan sudah siap

**Selamat deploy! 🚀**
