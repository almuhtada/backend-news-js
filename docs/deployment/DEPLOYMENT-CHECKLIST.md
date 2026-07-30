# Deployment Checklist

Checklist lengkap untuk deployment ke production VPS.

---

## Pre-Deployment (Di Local Machine)

### 1. Persiapan Files
- [ ] Pastikan semua code sudah di-commit ke git
- [ ] Test aplikasi di local dengan `npm run dev`
- [ ] Verifikasi semua endpoint API berfungsi
- [ ] Backup database development jika perlu migrate data

### 2. SSH Key Setup
- [ ] Generate SSH key jika belum punya: `ssh-keygen -t rsa -b 4096`
- [ ] Copy SSH key ke VPS: `ssh-copy-id deploy@your-vps-ip`
- [ ] Test SSH connection: `ssh deploy@your-vps-ip`

---

## Deployment Process

### 1. Upload Project ke VPS

```bash
rsync -avz --exclude 'node_modules' --exclude '.git' \
   -e ssh ./ deploy@your-vps-ip:/var/www/almuhtada/backend-news-js/
```

### 2. SSH ke VPS dan Install Dependencies

```bash
ssh deploy@your-vps-ip
cd /var/www/almuhtada/backend-news-js
npm ci --omit=dev
```

### 3. Configure .env

```bash
cp .env.example .env
nano .env
```

**Edit nilai-nilai ini:**
```env
DB_HOST=127.0.0.1
DB_USER=newsuser
DB_PASSWORD=STRONG_PWD
DB_NAME=news_production
NODE_ENV=production
PORT=3001
JWT_SECRET=$(openssl rand -base64 32)
BACKEND_URL=https://api.domain.com
CORS_ORIGINS=https://admin.domain.com
```

### 4. Start Aplikasi dengan PM2

```bash
pm2 startOrReload ecosystem.config.js --env production
pm2 save
pm2 startup
```

### 5. Verify Everything Works

```bash
curl http://localhost:3001/health
# Expected: {"success":true,"status":"healthy",...}

curl http://localhost:3001/api/posts
# Expected: JSON response dengan posts

pm2 status
# Expected: online status untuk almuhtada-api
```

---

## Security Setup

### 1. Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

### 2. SSL Certificate
```bash
sudo apt install nginx certbot python3-certbot-nginx -y
sudo cp config/nginx/nginx-api.conf /etc/nginx/sites-available/almuhtada-api
sudo ln -s /etc/nginx/sites-available/almuhtada-api /etc/nginx/sites-enabled/
sudo certbot --nginx -d api.domain.com
```

### 3. Security Best Practices
- [ ] Change default SSH port (edit /etc/ssh/sshd_config)
- [ ] Disable root SSH login
- [ ] Enable fail2ban
- [ ] Regular security updates: `sudo apt update && sudo apt upgrade`

---

## Monitoring Setup

### 1. Health Check
```bash
curl http://localhost:3001/health
```

### 2. Log Monitoring
```bash
pm2 logs almuhtada-api
pm2 logs almuhtada-api --lines 100
```

### 3. Resource Monitoring
```bash
htop
df -h
free -h
```

---

## Backup Setup

### 1. Manual Backup
```bash
mysqldump -u newsuser -p news_production | gzip > backups/db_$(date +%Y%m%d).sql.gz
```

Atau gunakan script:
```bash
bash scripts/deployment/backup.sh
```

### 2. Automatic Backup dengan Cron
```bash
crontab -e
0 2 * * * cd /var/www/almuhtada/backend-news-js && bash scripts/deployment/backup.sh >> logs/backup.log 2>&1
```

---

## Domain & DNS Setup

### 1. Point Domain to VPS
```bash
- [ ] Add A record: api.domain.com -> VPS_IP
- [ ] Add A record: admin.domain.com -> VPS_IP
- [ ] Wait for DNS propagation
```

### 2. Nginx Reverse Proxy
Config tersedia di `deploy/ubuntu/almuhtada-api.nginx.conf`

### 3. SSL Certificate
```bash
certbot --nginx -d api.domain.com
certbot renew --dry-run
```

---

## Testing Checklist

### 1. API Endpoints
- [ ] GET  /health
- [ ] GET  /api/posts
- [ ] POST /api/auth/login
- [ ] GET  /api/categories

### 2. Database
```bash
mysql -u newsuser -p
SHOW DATABASES;
USE news_production;
SHOW TABLES;
SELECT COUNT(*) FROM posts;
```

---

## Post-Deployment

### 1. Documentation
- [ ] Document server credentials (secure location)
- [ ] Note deployed version/commit hash

### 2. Monitoring
- [ ] Setup uptime monitoring (UptimeRobot, etc)
- [ ] Setup PM2 log rotate: `pm2 install pm2-logrotate`

---

## Quick Commands Reference

```bash
# PM2
pm2 status                    # Check status
pm2 logs almuhtada-api        # View logs
pm2 restart almuhtada-api     # Restart
pm2 reload almuhtada-api --update-env  # Reload with new env

# Docker
docker-compose up -d          # Start
docker-compose down           # Stop
docker-compose logs -f        # Logs

# Backup
bash scripts/deployment/backup.sh
bash scripts/deployment/restore.sh latest

# Update
git pull
npm ci --omit=dev
pm2 reload almuhtada-api --update-env
```

---

## Final Verification

- [ ] Aplikasi accessible dari internet
- [ ] Health endpoint returns healthy
- [ ] All API endpoints working
- [ ] Database connected
- [ ] SSL certificate installed (if domain)
- [ ] Firewall configured
- [ ] Backup working
- [ ] Monitoring setup
- [ ] PM2 startup enabled
