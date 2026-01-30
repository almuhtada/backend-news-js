# ✅ Deployment Checklist

Checklist lengkap untuk deployment ke production VPS.

---

## 📋 Pre-Deployment (Di Local Machine)

### 1. Persiapan Files
- [ ] Pastikan semua code sudah di-commit ke git
- [ ] Test aplikasi di local dengan `docker-compose up -d`
- [ ] Verifikasi semua endpoint API berfungsi
- [ ] Backup database development jika perlu migrate data

### 2. Edit Konfigurasi Deployment
```bash
- [ ] Edit deploy-vps.sh:
      VPS_USER="root"           # User SSH VPS Anda
      VPS_HOST="123.456.789.0"  # IP VPS Anda
      VPS_PORT="22"             # SSH port (biasanya 22)
```

### 3. SSH Key Setup
- [ ] Generate SSH key jika belum punya: `ssh-keygen -t rsa -b 4096`
- [ ] Copy SSH key ke VPS: `ssh-copy-id root@your-vps-ip`
- [ ] Test SSH connection: `ssh root@your-vps-ip`

---

## 🚀 Deployment Process

### 1. Jalankan Deployment Script
```bash
- [ ] chmod +x deploy-vps.sh
- [ ] bash deploy-vps.sh
```

**Script akan otomatis:**
- ✅ Detect OS (Ubuntu/AlmaLinux)
- ✅ Install Docker & Docker Compose
- ✅ Install Node.js & PM2
- ✅ Setup firewall
- ✅ Handle SELinux (AlmaLinux)
- ✅ Upload project files
- ✅ Create .env template

### 2. SSH ke VPS dan Configure .env

```bash
- [ ] ssh root@your-vps-ip
- [ ] cd /var/www/news-backend
- [ ] nano .env
```

**Edit nilai-nilai ini:**

#### Database (OTOMATIS DIBUAT oleh Docker):
```env
- [ ] DB_HOST=mysql              # JANGAN UBAH!
- [ ] DB_USER=newsuser           # Bisa ganti
- [ ] DB_PASSWORD=STRONG_PWD     # WAJIB ganti!
- [ ] DB_NAME=news_production    # Bisa ganti
- [ ] DB_PORT=3306               # JANGAN UBAH!
```

#### Application:
```env
- [ ] NODE_ENV=production
- [ ] PORT=3001
- [ ] JWT_SECRET=RANDOM_SECRET   # Generate: openssl rand -base64 32
```

#### API Keys:
```env
- [ ] GROQ_API_KEY=your_actual_groq_key
- [ ] TELEGRAM_BOT_TOKEN=your_actual_token
- [ ] TELEGRAM_CHAT_ID=your_actual_chat_id
```

#### Backend URL:
```env
- [ ] BACKEND_URL=https://your-domain.com  # Atau http://your-ip:3001
```

### 3. Start Aplikasi

```bash
- [ ] docker-compose up -d
- [ ] docker-compose ps          # Check status
- [ ] docker-compose logs -f     # Check logs
```

### 4. Verify Everything Works

```bash
- [ ] curl http://localhost:3001/health
      Expected: {"status":"ok",...}

- [ ] curl http://localhost:3001/api/posts
      Expected: JSON response dengan posts

- [ ] docker ps
      Expected: 2 containers running (news-backend, news-mysql)
```

---

## 🔐 Security Setup

### 1. Firewall
```bash
# Ubuntu
- [ ] ufw status
- [ ] ufw allow 22,80,443,3001/tcp

# AlmaLinux
- [ ] firewall-cmd --list-all
- [ ] firewall-cmd --permanent --add-port=3001/tcp
- [ ] firewall-cmd --reload
```

### 2. SSL Certificate (Recommended)
```bash
- [ ] Install Nginx: apt-get install nginx (Ubuntu)
                     dnf install nginx (AlmaLinux)

- [ ] Configure Nginx reverse proxy
- [ ] Install certbot: apt-get install certbot python3-certbot-nginx
- [ ] Get SSL cert: certbot --nginx -d your-domain.com
```

### 3. Security Best Practices
- [ ] Change default SSH port (edit /etc/ssh/sshd_config)
- [ ] Disable root SSH login
- [ ] Enable fail2ban
- [ ] Regular security updates: `apt update && apt upgrade`

---

## 📊 Monitoring Setup

### 1. Health Check
```bash
- [ ] Test endpoint: curl http://localhost:3001/health
- [ ] Setup monitoring script:
      crontab -e
      */5 * * * * cd /var/www/news-backend && bash monitor.sh
```

### 2. Log Monitoring
```bash
- [ ] docker-compose logs -f              # Real-time logs
- [ ] docker-compose logs --tail=100      # Last 100 lines
- [ ] Install log rotation
```

### 3. Resource Monitoring
```bash
- [ ] docker stats                        # Container resources
- [ ] htop                               # System resources
- [ ] df -h                              # Disk usage
```

---

## 💾 Backup Setup

### 1. Automatic Backup
```bash
- [ ] Test manual backup: bash backup.sh
- [ ] Setup cron job:
      crontab -e
      0 2 * * * cd /var/www/news-backend && bash backup.sh >> logs/backup.log 2>&1
```

### 2. Verify Backup
```bash
- [ ] ls -lh backups/
- [ ] Test restore: bash restore.sh latest
```

### 3. Remote Backup (Recommended)
```bash
- [ ] Setup rsync to backup server
- [ ] Or use cloud storage (S3, Google Cloud)
```

---

## 🌐 Domain & DNS Setup (Optional)

### 1. Point Domain to VPS
```bash
- [ ] Add A record: your-domain.com → VPS_IP
- [ ] Wait for DNS propagation (bisa sampai 24 jam)
- [ ] Test: ping your-domain.com
```

### 2. Nginx Reverse Proxy
```bash
- [ ] Create nginx config: /etc/nginx/sites-available/news-backend
- [ ] Enable site: ln -s /etc/nginx/sites-available/news-backend /etc/nginx/sites-enabled/
- [ ] Test config: nginx -t
- [ ] Reload nginx: systemctl reload nginx
```

### 3. SSL Certificate
```bash
- [ ] certbot --nginx -d your-domain.com
- [ ] Test auto-renewal: certbot renew --dry-run
```

---

## 🧪 Testing Checklist

### 1. API Endpoints
```bash
- [ ] GET  /health
- [ ] GET  /api/posts
- [ ] POST /api/auth/login
- [ ] GET  /api/categories
- [ ] POST /api/posts (with auth)
```

### 2. Database
```bash
- [ ] docker exec -it news-mysql mysql -u newsuser -p
- [ ] SHOW DATABASES;
- [ ] USE news_production;
- [ ] SHOW TABLES;
- [ ] SELECT COUNT(*) FROM posts;
```

### 3. Performance
```bash
- [ ] Response time < 500ms
- [ ] Memory usage < 80%
- [ ] CPU usage < 70%
- [ ] Disk space available > 20%
```

---

## 🔄 Post-Deployment

### 1. Documentation
```bash
- [ ] Document server credentials (secure location)
- [ ] Update API documentation
- [ ] Note deployed version/commit hash
```

### 2. Team Notification
```bash
- [ ] Notify team deployment completed
- [ ] Share new production URL
- [ ] Share documentation updates
```

### 3. Monitoring
```bash
- [ ] Setup uptime monitoring (UptimeRobot, etc)
- [ ] Setup error tracking (Sentry, etc)
- [ ] Setup analytics
```

---

## 🚨 Emergency Recovery Plan

### If Something Goes Wrong:

#### 1. Quick Restart
```bash
- [ ] ssh root@vps
- [ ] cd /var/www/news-backend
- [ ] bash quick-start.sh
```

#### 2. Restore from Backup
```bash
- [ ] bash restore.sh latest
- [ ] docker-compose restart
```

#### 3. Check Logs
```bash
- [ ] docker-compose logs backend
- [ ] docker-compose logs mysql
- [ ] tail -f logs/pm2-error.log
```

#### 4. Contact Support
```bash
- [ ] Document the error
- [ ] Check troubleshooting guide
- [ ] Contact admin/developer
```

---

## 📱 Quick Commands Reference

```bash
# Check status
docker-compose ps
docker stats
systemctl status docker

# View logs
docker-compose logs -f
docker-compose logs backend --tail=100

# Restart
docker-compose restart
docker-compose restart backend

# Stop/Start
docker-compose down
docker-compose up -d

# Backup/Restore
bash backup.sh
bash restore.sh latest

# Monitor
bash monitor.sh
pm2 monit (if using PM2)

# Update
git pull
docker-compose down && docker-compose up -d --build
```

---

## ✅ Final Verification

Sebelum consider deployment success:

- [ ] ✅ Aplikasi accessible dari internet
- [ ] ✅ Health endpoint returns OK
- [ ] ✅ All API endpoints working
- [ ] ✅ Database connected
- [ ] ✅ SSL certificate installed (if domain)
- [ ] ✅ Firewall configured
- [ ] ✅ Backup working
- [ ] ✅ Monitoring setup
- [ ] ✅ Emergency recovery tested
- [ ] ✅ Documentation updated

---

## 🎉 Deployment Complete!

Jika semua checklist di atas ✅, deployment Anda berhasil!

**Next Steps:**
1. Monitor aplikasi 24 jam pertama
2. Test semua features
3. Setup continuous deployment (optional)
4. Regular maintenance schedule

**Good luck! 🚀**
