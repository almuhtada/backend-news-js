# Quick Deploy Reference

Referensi cepat untuk deployment dan management.

## Files Created

```
backend-news-js/
├── Dockerfile                 # Docker image configuration
├── docker-compose.yml         # Multi-container Docker setup
├── .dockerignore              # Files to exclude from Docker
├── ecosystem.config.js        # PM2 configuration
├── .env.example               # Environment template
├── app.js                     # Entry point
│
├── config/
│   ├── nginx/nginx-api.conf   # Nginx config
│   └── systemd/news-backend.service  # Systemd service
│
├── deploy/ubuntu/
│   └── almuhtada-api.nginx.conf
│
├── scripts/deployment/
│   ├── deploy.sh              # Local Docker deployment
│   ├── deploy-vps.sh          # VPS setup (auto-detect OS)
│   ├── setup-ubuntu.sh        # Ubuntu/Debian specific setup
│   ├── setup-almalinux.sh     # AlmaLinux/RHEL specific setup
│   ├── setup-nginx.sh         # Nginx auto-setup
│   ├── setup-direct.sh        # Direct VPS setup
│   ├── backup.sh              # Database backup script
│   ├── restore.sh             # Database restore script
│   ├── quick-start.sh         # Emergency recovery
│   └── monitor.sh             # Health monitoring
│
└── docs/deployment/
    ├── DEPLOYMENT.md          # Main deployment guide
    ├── DOCKER-DEPLOYMENT.md   # Docker documentation
    ├── QUICK-DEPLOY.md        # This file
    └── ...
```

## Supported OS (Auto-Detection)

- Ubuntu 20.04+ / Debian 11+
- AlmaLinux 8+ / Rocky Linux 8+
- RHEL 8+ / CentOS Stream 8+

Script di `scripts/deployment/` akan otomatis detect OS.

---

## Quick Commands

### Local Development

```bash
npm install
npm run dev
```

### Local Development (Docker)

```bash
docker-compose up -d
docker-compose logs -f
docker-compose down
```

### Production dengan PM2

```bash
npm ci --omit=dev
pm2 startOrReload ecosystem.config.js --env production
pm2 save
pm2 startup
pm2 logs almuhtada-api
pm2 restart almuhtada-api
pm2 monit
```

### Update Production

```bash
git pull
npm ci --omit=dev
pm2 reload almuhtada-api --update-env
```

### Backup & Restore

```bash
# Manual
mysqldump -u user -p db | gzip > backups/backup_$(date +%Y%m%d).sql.gz

# Pakai script
bash scripts/deployment/backup.sh
bash scripts/deployment/restore.sh latest
```

### Emergency Recovery

```bash
bash scripts/deployment/quick-start.sh
# Options: 1. Docker, 2. PM2, 3. Node.js (testing only)
```

---

## Environment Variables (.env)

**Development:**
```env
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=root
DB_NAME=news_db
DB_PORT=3306
PORT=3001
NODE_ENV=development
```

**Production:**
```env
DB_HOST=127.0.0.1
DB_USER=newsuser
DB_PASSWORD=STRONG_PASSWORD
DB_NAME=news_production
DB_PORT=3306
PORT=3001
NODE_ENV=production
BACKEND_URL=https://api.domain.com
CORS_ORIGINS=https://admin.domain.com
JWT_SECRET=$(openssl rand -base64 32)
```

---

## Troubleshooting Quick Fix

```bash
# Container tidak start
docker-compose down -v && docker-compose up -d --build

# Port sudah digunakan
lsof -ti:3001 | xargs kill -9

# Database error
docker-compose restart mysql

# PM2 error
pm2 logs almuhtada-api --lines 100
pm2 restart almuhtada-api

# Permission issues
chmod -R 755 uploads logs backups
```

---

## Important URLs

- Backend: `http://localhost:3001`
- Health: `http://localhost:3001/health`
- API Docs: `http://localhost:3001/api-docs`
