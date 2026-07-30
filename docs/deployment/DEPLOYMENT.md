# Deployment Guide - Almuhtada News Backend

## Overview

Sistem backend untuk Almuhtada News berbasis Express.js dengan MySQL (Sequelize ORM).

## 1. Setup Development Lokal

### Prerequisites
- Node.js (v18+)
- MySQL 8.0+
- npm

### Steps

1. **Clone project**
```bash
cd backend-news-js
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment**
```bash
cp .env.example .env
```

Edit `.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=news_db
DB_PORT=3306
JWT_SECRET=ganti_dengan_secret_key_yang_aman
PORT=3001
```

4. **Create database**
```sql
CREATE DATABASE news_db;
```

5. **Start development**
```bash
npm run dev
```

Akan muncul:
```
Server running on port 3001
```

## 2. Production dengan PM2

### Setup

```bash
# Install PM2 global
npm install -g pm2

# Start aplikasi
pm2 start ecosystem.config.js --env production

# Save process list
pm2 save

# Setup auto-start on reboot
pm2 startup
```

### Logs

```bash
pm2 logs almuhtada-api
pm2 monit
```

## 3. Production dengan Docker

```bash
# Build dan start
docker-compose up -d

# Check status
docker-compose ps

# Logs
docker-compose logs -f
```

## 4. Setup Nginx Reverse Proxy

### Instalasi Nginx

```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl enable nginx
```

### Konfigurasi

Copy config dari `deploy/ubuntu/almuhtada-api.nginx.conf` atau `config/nginx/nginx-api.conf`:

```bash
sudo cp config/nginx/nginx-api.conf /etc/nginx/sites-available/almuhtada-api
sudo ln -s /etc/nginx/sites-available/almuhtada-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### SSL dengan Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.almuhtada.org
```

## 5. Environment Variables (.env)

```
DB_HOST=localhost / mysql (Docker)
DB_PORT=3306
DB_NAME=news_db
DB_USER=your_user
DB_PASSWORD=your_password
NODE_ENV=production
PORT=3001
BACKEND_URL=https://api.domain.com
CORS_ORIGINS=https://admin.domain.com,https://domain.com
JWT_SECRET=generate_with_openssl_rand_-base64_32
GROQ_API_KEY=your_groq_key
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
TELEGRAM_TOPIC_PENULIS=3
TELEGRAM_TOPIC_EDITOR=2
```

## 6. Testing

```bash
# Health check
curl http://localhost:3001/health

# API endpoints
curl http://localhost:3001/api/posts
curl http://localhost:3001/api-docs
```

## 7. Troubleshooting

### Database connection error
```text
Fatal startup error: connect ECONNREFUSED
```
- Check MySQL is running
- Verify credentials in `.env`

### Port already in use
```text
Port 3001 is already in use
```
```bash
lsof -ti:3001 | xargs kill -9
```

### PM2 not starting
```bash
pm2 logs almuhtada-api --lines 50
pm2 restart almuhtada-api
```

## 8. Maintenance

### Update code
```bash
git pull
npm ci --omit=dev
pm2 reload almuhtada-api --update-env
```

### Backup database
```bash
mysqldump -u user -p database_name > backup_$(date +%Y%m%d).sql
```

### Monitor logs
```bash
pm2 logs almuhtada-api
tail -f logs/pm2-error.log
```

## 9. Backup Scripts

Tersedia di `scripts/deployment/`:
- `backup.sh` - Backup database
- `restore.sh` - Restore database
- `deploy.sh` - Local Docker deployment
- `deploy-vps.sh` - VPS auto-setup (multi-OS)
- `setup-ubuntu.sh` - Ubuntu setup
- `setup-almalinux.sh` - AlmaLinux setup
- `monitor.sh` - Health monitoring
- `quick-start.sh` - Emergency recovery
- `setup-nginx.sh` - Nginx auto-setup
- `setup-direct.sh` - Direct VPS setup
