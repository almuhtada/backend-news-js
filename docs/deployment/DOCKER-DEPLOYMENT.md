# Docker Deployment Guide - News Backend

Panduan lengkap untuk deploy aplikasi News Backend menggunakan Docker dan PM2 ke VPS.

## Daftar Isi

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

## Local Development dengan Docker

### 1. Setup Awal

```bash
git clone <your-repo-url>
cd backend-news-js

cp .env.example .env
nano .env
```

### 2. Start Development

```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```

### 3. Akses Aplikasi

- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health
- MySQL: localhost:3306

### 4. Useful Commands

```bash
docker-compose restart
docker-compose up -d --build
docker-compose ps
docker exec -it news-backend sh
docker exec -it news-mysql bash
docker-compose logs -f backend
```

---

## Deploy ke VPS (First Time)

### Persiapan VPS

```bash
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
ssh-copy-id deploy@your-vps-ip
```

### Upload Project

```bash
rsync -avz --exclude 'node_modules' --exclude '.git' \
   -e ssh ./ deploy@your-vps-ip:/var/www/almuhtada/backend-news-js/
```

### Konfigurasi di VPS

```bash
ssh deploy@your-vps-ip
cd /var/www/almuhtada/backend-news-js
cp .env.example .env
nano .env
```

**PENTING**: Update nilai-nilai ini di `.env`:
```env
DB_HOST=127.0.0.1
DB_USER=newsuser
DB_PASSWORD=GANTI_PASSWORD_YANG_KUAT
DB_NAME=news_db
DB_PORT=3306
JWT_SECRET=GANTI_DENGAN_SECRET_KEY_YANG_KUAT
GROQ_API_KEY=your_actual_groq_api_key
TELEGRAM_BOT_TOKEN=your_actual_telegram_token
BACKEND_URL=https://your-domain.com
NODE_ENV=production
PORT=3001
CORS_ORIGINS=https://admin.your-domain.com
```

### Start Aplikasi

**Dengan Docker:**
```bash
docker-compose up -d
docker-compose ps
docker-compose logs -f
```

**Dengan PM2 (tanpa Docker):**
```bash
npm ci --omit=dev
pm2 startOrReload ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Setup Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### Setup Nginx Reverse Proxy

Config tersedia di `deploy/ubuntu/almuhtada-api.nginx.conf` atau `config/nginx/nginx-api.conf`:

```bash
sudo apt install nginx -y
sudo cp config/nginx/nginx-api.conf /etc/nginx/sites-available/almuhtada-api
sudo ln -s /etc/nginx/sites-available/almuhtada-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Setup SSL dengan Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

---

## Update/Redeploy

### Update dari Local ke VPS

```bash
rsync -avz --exclude 'node_modules' --exclude '.git' \
   -e ssh ./ deploy@vps:/var/www/almuhtada/backend-news-js/

ssh deploy@vps
cd /var/www/almuhtada/backend-news-js
npm ci --omit=dev
pm2 reload almuhtada-api --update-env
```

### Update di VPS Langsung

```bash
git pull
npm ci --omit=dev
pm2 reload almuhtada-api --update-env
```

### Update dengan Docker

```bash
docker-compose down
docker-compose up -d --build
```

---

## Backup & Restore

### Backup Database

```bash
# Manual
mysqldump -u newsuser -p news_db | gzip > backups/backup_$(date +%Y%m%d).sql.gz

# Atau pakai script
bash scripts/deployment/backup.sh
```

### Automatic Backup dengan Cron

```bash
crontab -e
0 2 * * * cd /var/www/almuhtada/backend-news-js && bash scripts/deployment/backup.sh >> logs/backup.log 2>&1
```

### Restore Database

```bash
bash scripts/deployment/restore.sh latest
# Atau
gunzip < backups/backup_file.sql.gz | mysql -u newsuser -p news_db
```

---

## Emergency Recovery

Jika server crash atau terjadi masalah:

```bash
bash scripts/deployment/quick-start.sh
```

Script ini memberikan 3 opsi:
1. **Docker** (Recommended) - Start dengan Docker Compose
2. **PM2** - Start dengan PM2 process manager
3. **Node.js** - Start langsung dengan Node (testing only)

---

## PM2 Alternative

Jika tidak mau pakai Docker, bisa pakai PM2 untuk production:

### Setup PM2

```bash
npm install
npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup systemd
```

### PM2 Commands

```bash
pm2 logs almuhtada-api
pm2 monit
pm2 restart almuhtada-api
pm2 stop almuhtada-api
pm2 delete almuhtada-api
pm2 status
```

### PM2 dengan Database Terpisah

Jika pakai PM2 (tanpa Docker MySQL), install MySQL terpisah:

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

Buat database dan user:
```sql
CREATE DATABASE news_db;
CREATE USER 'newsuser'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL PRIVILEGES ON news_db.* TO 'newsuser'@'localhost';
FLUSH PRIVILEGES;
```

Update `.env`:
```env
DB_HOST=127.0.0.1
DB_USER=newsuser
DB_PASSWORD=your_password
DB_NAME=news_db
DB_PORT=3306
```

---

## Troubleshooting

### Container Tidak Start

```bash
docker-compose logs
docker-compose logs backend
docker-compose logs mysql
docker-compose restart
docker-compose down -v && docker-compose up -d --build
```

### Database Connection Error

```bash
docker ps | grep mysql
docker-compose logs mysql
docker exec -it news-backend sh -c "nc -zv mysql 3306"
docker-compose restart mysql
```

### Port Sudah Digunakan

```bash
lsof -i :3001
lsof -i :3306
kill -9 <PID>
# Atau ubah port di .env
```

### PM2 Process Crash

```bash
pm2 logs almuhtada-api --lines 100
pm2 flush
pm2 restart almuhtada-api
```

---

## Monitoring

### Health Check

```bash
curl http://localhost:3001/health
# Response: {"success":true,"status":"healthy",...}
```

### Docker Stats

```bash
docker stats
docker inspect news-backend
```

### Log Monitoring

```bash
docker-compose logs -f
docker-compose logs --tail=100
docker-compose logs -f backend
pm2 logs almuhtada-api
```

---

## Best Practices

1. Selalu backup sebelum update
2. Gunakan `.env` untuk secrets - jangan commit ke git
3. Setup monitoring (health check, uptime monitoring)
4. Regular backups dengan cron
5. Update packages secara berkala
6. Gunakan SSL/HTTPS
7. Restrict database access (port 3306 tidak boleh publik)
