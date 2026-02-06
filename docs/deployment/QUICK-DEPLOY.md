# 🚀 Quick Deploy Reference

Referensi cepat untuk deployment dan management.

## 📦 Files Created

```
backend-news-express/
├── Dockerfile                 # Docker image configuration
├── docker-compose.yml         # Multi-container Docker setup
├── .dockerignore             # Files to exclude from Docker
├── ecosystem.config.js       # PM2 configuration
├── .env.example              # Environment template
│
├── deploy.sh                 # Local Docker deployment
├── deploy-vps.sh             # VPS setup (auto-detect OS) ⭐
├── setup-ubuntu.sh           # Ubuntu/Debian specific setup
├── setup-almalinux.sh        # AlmaLinux/RHEL specific setup
├── backup.sh                 # Database backup script
├── restore.sh                # Database restore script
├── quick-start.sh            # Emergency recovery
├── monitor.sh                # Health monitoring
│
├── DOCKER-DEPLOYMENT.md      # Complete documentation
├── QUICK-DEPLOY.md           # This file
└── OS-SUPPORT.md             # OS compatibility guide ⭐
```

## 🐧 Supported OS (Auto-Detection)

- ✅ Ubuntu 20.04+ / Debian 11+
- ✅ AlmaLinux 8+ / Rocky Linux 8+
- ✅ RHEL 8+ / CentOS Stream 8+

Script akan **otomatis detect OS** dan install dengan package manager yang sesuai!

---

## ⚡ Quick Commands

### Local Development (Docker)

```bash
# Start
docker-compose up -d

# Logs
docker-compose logs -f

# Stop
docker-compose down

# Backup DB
bash backup.sh

# Restore DB
bash restore.sh latest
```

### VPS Deployment (First Time)

**Semua OS (Auto-Detection):**
```bash
# 1. Edit deploy-vps.sh
nano deploy-vps.sh
# Ubah: VPS_USER, VPS_HOST

# 2. Deploy (auto-detect Ubuntu/AlmaLinux)
bash deploy-vps.sh

# 3. SSH ke VPS dan edit .env
ssh root@your-vps-ip
cd /var/www/news-backend
nano .env

# 4. Start
docker-compose up -d
```

**Manual Setup (OS-Specific):**
```bash
# Ubuntu/Debian
bash setup-ubuntu.sh

# AlmaLinux/RHEL
bash setup-almalinux.sh
```

### Update Production

```bash
# From local
rsync -avz --exclude 'node_modules' -e ssh ./ root@vps:/var/www/news-backend/

# On VPS
ssh root@vps
cd /var/www/news-backend
docker-compose down && docker-compose up -d --build
```

### PM2 Alternative

```bash
# Install
npm install -g pm2

# Start
pm2 start ecosystem.config.js --env production

# Save
pm2 save

# Setup auto-start
pm2 startup systemd

# Commands
pm2 logs news-backend
pm2 restart news-backend
pm2 monit
```

### Emergency Recovery

```bash
# Quick start with options
bash quick-start.sh

# Options:
# 1. Docker (recommended)
# 2. PM2
# 3. Node.js (testing only)
```

### Backup & Restore

```bash
# Manual backup
bash backup.sh

# Auto backup (cron)
crontab -e
0 2 * * * cd /var/www/news-backend && bash backup.sh

# Restore latest
bash restore.sh latest

# Restore specific
bash restore.sh backups/backup_xxx.sql.gz
```

---

## 🔍 Troubleshooting Quick Fix

```bash
# Container tidak start
docker-compose down -v
docker-compose up -d --build

# Port sudah digunakan
lsof -i :3001
kill -9 <PID>

# Database error
docker-compose restart mysql

# Permission issues
chmod -R 755 uploads logs backups

# View errors
docker-compose logs backend
docker-compose logs mysql
pm2 logs news-backend
```

---

## 📋 Environment Variables (.env)

**Development:**
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=root
DB_NAME=wp397
DB_PORT=8889
PORT=3001
NODE_ENV=development
```

**Production (Docker):**
```env
DB_HOST=mysql
DB_USER=newsuser
DB_PASSWORD=STRONG_PASSWORD
DB_NAME=news_db
DB_PORT=3306
PORT=3001
NODE_ENV=production
BACKEND_URL=https://your-domain.com
```

---

## 🎯 Production Checklist

- [ ] `.env` configured with strong passwords
- [ ] Firewall enabled (ufw allow 22,80,443,3001)
- [ ] Nginx reverse proxy setup
- [ ] SSL certificate installed (certbot)
- [ ] Automatic backup cron job
- [ ] Health check tested
- [ ] Monitoring setup
- [ ] PM2 startup script enabled

---

## 🔗 Important URLs

- Backend: `http://localhost:3001`
- Health: `http://localhost:3001/health`
- API Docs: `http://localhost:3001/api-docs`

---

## 📞 Quick Help

**Logs:**
- Docker: `docker-compose logs -f`
- PM2: `pm2 logs news-backend`

**Restart:**
- Docker: `docker-compose restart`
- PM2: `pm2 restart news-backend`

**Status:**
- Docker: `docker-compose ps`
- PM2: `pm2 list`

**Backup:**
- Create: `bash backup.sh`
- Restore: `bash restore.sh latest`

---

Untuk dokumentasi lengkap, baca [DOCKER-DEPLOYMENT.md](DOCKER-DEPLOYMENT.md)
