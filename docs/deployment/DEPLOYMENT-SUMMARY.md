# Deployment Setup - Summary

Setup lengkap Docker, PM2, dan Nginx untuk deployment News Backend ke VPS.

## Files yang Dibuat

### Docker Files
1. **Dockerfile** - Docker image configuration
2. **docker-compose.yml** - Multi-container setup (Backend + MySQL)
3. **.dockerignore** - Files yang di-exclude dari Docker build

### Configuration Files
4. **ecosystem.config.js** - PM2 process manager configuration
5. **.env.example** - Environment variables template
6. **config/nginx/nginx-api.conf** - Nginx reverse proxy config
7. **config/systemd/news-backend.service** - Systemd service
8. **deploy/ubuntu/almuhtada-api.nginx.conf** - Nginx config for Ubuntu

### Deployment Scripts (scripts/deployment/)
9. **deploy.sh** - Local Docker deployment script
10. **deploy-vps.sh** - VPS setup dengan OS auto-detection
11. **setup-ubuntu.sh** - Ubuntu/Debian specific setup
12. **setup-almalinux.sh** - AlmaLinux/RHEL specific setup
13. **setup-nginx.sh** - Nginx auto-setup script
14. **setup-direct.sh** - Direct VPS setup
15. **quick-start.sh** - Emergency recovery script

### Backup & Monitoring Scripts (scripts/deployment/)
16. **backup.sh** - Database backup script
17. **restore.sh** - Database restore script
18. **monitor.sh** - Health monitoring & auto-restart script

### Documentation (docs/deployment/)
19. **DOCKER-DEPLOYMENT.md** - Dokumentasi lengkap deployment
20. **QUICK-DEPLOY.md** - Quick reference commands
21. **OS-SUPPORT.md** - OS compatibility & auto-detection guide
22. **OS-COMPARISON.md** - Command comparison Ubuntu vs AlmaLinux
23. **NGINX-SETUP.md** - Nginx setup guide
24. **NGINX-QUICKSTART.md** - Nginx quick start
25. **README_VPS.md** - VPS production guide

---

## Quick Start Guide

### Untuk Development Lokal:
```bash
cp .env.example .env
nano .env
npm install
npm run dev
```

### Untuk Deploy ke VPS dengan PM2:
```bash
rsync -avz --exclude 'node_modules' --exclude '.git' -e ssh ./ deploy@vps:/var/www/almuhtada/backend-news-js/
ssh deploy@vps
cd /var/www/almuhtada/backend-news-js
cp .env.example .env && nano .env
npm ci --omit=dev && pm2 startOrReload ecosystem.config.js --env production && pm2 save && pm2 startup
```

### Untuk Deploy dengan Docker:
```bash
docker-compose up -d
```

### Emergency Recovery:
```bash
bash scripts/deployment/quick-start.sh
```

---

## 3 Metode Deployment

### 1. Docker (Recommended)
```bash
docker-compose up -d
```
- Isolated environment
- Include MySQL dalam container
- Auto-restart on failure

### 2. PM2 Process Manager
```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
```
- Lightweight
- Auto-restart on crash
- Log management

### 3. Node.js Langsung
```bash
npm start
```
- Untuk development/testing saja

---

## Directory Structure

```
almuhtada/
├── backend-news-js/
│   ├── app.js                     # Entry point
│   ├── src/
│   │   ├── server.js              # Express app setup
│   │   ├── config/                # Database config
│   │   ├── controller/            # Route handlers
│   │   ├── modules/               # Feature modules
│   │   └── ...
│   ├── config/
│   │   ├── nginx/nginx-api.conf   # Nginx config
│   │   └── systemd/news-backend.service
│   ├── deploy/ubuntu/             # Nginx config for Ubuntu
│   ├── scripts/deployment/        # Deployment scripts
│   ├── docs/deployment/           # Documentation
│   ├── ecosystem.config.js        # PM2 config
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── .env.example
│   ├── uploads/
│   ├── backups/
│   └── logs/
│
└── dashboard-news-ts/             # Frontend dashboard
```

---

## Production Setup Recommendations

### 1. Nginx Reverse Proxy
Config: `deploy/ubuntu/almuhtada-api.nginx.conf`

### 2. SSL dengan Let's Encrypt
```bash
certbot --nginx -d api.domain.com
```

### 3. Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```
