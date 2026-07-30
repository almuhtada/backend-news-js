# Panduan VPS Production — Backend dan Dashboard

Dokumen ini untuk menjalankan `backend-news-js` dan `dashboard-news-ts` pada satu VPS Ubuntu. Dashboard adalah aplikasi statis; beban utama VPS berasal dari API Node.js, MySQL, dan penyimpanan upload.

---

## Daftar Isi

1. [Rekomendasi Spek](#rekomendasi-spek)
2. [Arsitektur](#arsitektur-yang-dipakai)
3. [Konfigurasi Wajib](#konfigurasi-wajib)
4. [Setup Awal VPS](#setup-awal-vps)
5. [Install Dependency](#install-dependency)
6. [Deploy Backend](#deploy-backend)
7. [Setup Nginx](#setup-nginx)
8. [Deploy Dashboard](#deploy-dashboard)
9. [Firewall dan Izin File](#firewall-dan-izin-file)
10. [PM2 Startup](#menjaga-server-tetap-hidup)
11. [Backup dan Monitoring](#backup-dan-monitoring)
12. [Update Aman](#update-aman)
13. [Update Sistem](#update-sistem-tanpa-mengagetkan-server)
14. [Checklist Go-Live](#checklist-sebelum-go-live)

---

## Rekomendasi Spek

| Kondisi | CPU | RAM | Disk | Cocok untuk |
| --- | ---: | ---: | --- | --- |
| Minimum aman | 2 vCPU | 4 GB | 60 GB NVMe | Traffic kecil, satu admin, database dan upload masih kecil |
| Disarankan | 4 vCPU | 8 GB | 80–160 GB NVMe | Produksi harian, upload gambar, cache database, dan ruang tumbuh |
| Bertumbuh | 4–8 vCPU | 16 GB | 160 GB+ NVMe | Banyak pembaca, upload sering, laporan/AI, atau database besar |

Jangan memakai VPS 1 vCPU / 1 GB RAM untuk kombinasi Node.js + MySQL. Dashboard statis memang ringan, tetapi MySQL, proses build, dan upload dapat membuat RAM cepat penuh. Tambahkan swap 2 GB sebagai penyangga, bukan pengganti RAM.

---

## Arsitektur yang Dipakai

```
Internet
| HTTPS 443
v
Nginx
|- admin.domain.com -> /var/www/almuhtada/dashboard-news-ts/dist
`- api.domain.com   -> http://127.0.0.1:3001 -> PM2 -> backend-news-js -> MySQL
                                                                         |
                                                                    /var/www/almuhtada/backend-news-js/uploads
```

Hanya Nginx yang dibuka ke internet. Port API `3001` dan MySQL `3306` harus tetap lokal/private.

---

## Konfigurasi Wajib

1. Gunakan **Ubuntu LTS** (22.04 atau 24.04).
2. Buat user `deploy` biasa; jangan deploy dengan user `root`.
3. Gunakan SSH key, lalu nonaktifkan login password dan login root setelah akses key teruji.
4. Pasang Nginx, Node.js LTS, PM2, MySQL, UFW, dan Certbot.
5. Arahkan DNS `api.domain.com` dan `admin.domain.com` ke IP VPS, lalu aktifkan HTTPS.
6. Isi `.env` backend langsung di VPS. File itu tidak boleh masuk Git atau dikirim ke frontend.

---

## Setup Awal VPS

### 1. SSH ke VPS

```bash
ssh root@IP_VPS_ANDA
```

### 2. Buat User Deploy

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

### 3. Setup SSH Key

Dari lokal:
```bash
ssh-copy-id deploy@IP_VPS_ANDA
ssh deploy@IP_VPS_ANDA
```

Setelah teruji, root login bisa dimatikan:
```bash
sudo sed -i 's/^PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sudo systemctl reload sshd
```

### 4. Update Sistem

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw
```

---

## Install Dependency

### Node.js LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs
node --version  # v22.x
npm --version
```

### MySQL 8.0

```bash
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

Buat database dan user:
```bash
sudo mysql
```

```sql
CREATE DATABASE almuhtada_prod CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'almuhtada'@'localhost' IDENTIFIED BY 'BUAT_PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON almuhtada_prod.* TO 'almuhtada'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

### PM2

```bash
sudo npm install -g pm2
```

---

## Deploy Backend

### 1. Buat Direktori

```bash
sudo mkdir -p /var/www/almuhtada
sudo chown deploy:deploy /var/www/almuhtada
```

### 2. Clone atau Upload

**Via git:**
```bash
cd /var/www/almuhtada
git clone <repo-url> backend-news-js
cd backend-news-js
```

**Atau rsync dari lokal:**
```bash
# Dari local machine
rsync -avz --exclude 'node_modules' --exclude '.git' \
   -e ssh ./backend-news-js deploy@IP_VPS_ANDA:/var/www/almuhtada/
```

### 3. Install Dependencies

```bash
cd /var/www/almuhtada/backend-news-js
npm ci --omit=dev
```

### 4. Setup Environment

```bash
cp .env.example .env
nano .env
```

Isi dengan nilai production:
```env
NODE_ENV=production
PORT=3001
BACKEND_URL=https://api.domain.com
CORS_ORIGINS=https://admin.domain.com

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=almuhtada_prod
DB_USER=almuhtada
DB_PASSWORD=BUAT_PASSWORD_KUAT

JWT_SECRET=GENERATE_A_LONG_RANDOM_SECRET

GROQ_API_KEY=gsk_isi_dari_console_groq
TELEGRAM_BOT_TOKEN=isi_dari_botfather
TELEGRAM_CHAT_ID=isi_chat_id
TELEGRAM_TOPIC_PENULIS=3
TELEGRAM_TOPIC_EDITOR=2
```

Generate JWT secret:
```bash
openssl rand -base64 32
# Paste hasilnya ke JWT_SECRET
```

### 5. Setup Direktori Upload dan Logs

```bash
mkdir -p uploads logs backups
chmod 755 uploads logs backups
chmod 600 .env
```

### 6. Start dengan PM2

```bash
pm2 startOrReload ecosystem.config.js --env production
pm2 save
pm2 startup
# Jalankan perintah sudo yang muncul dari output PM2
```

### 7. Verifikasi

```bash
pm2 status
# Harusnya almuhtada-api online

curl http://localhost:3001/health
# {"success":true,"status":"healthy","timestamp":"..."}

curl http://localhost:3001/api-docs
# Swagger UI
```

---

## Setup Nginx

### 1. Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 2. Copy Konfigurasi Backend

Gunakan file config yang sudah tersedia di project:

```bash
sudo cp /var/www/almuhtada/backend-news-js/config/nginx/nginx-api.conf \
      /etc/nginx/sites-available/api.domain.com

# atau pakai yang minimal:
sudo cp /var/www/almuhtada/backend-news-js/deploy/ubuntu/almuhtada-api.nginx.conf \
      /etc/nginx/sites-available/api.domain.com
```

Edit domain:
```bash
sudo nano /etc/nginx/sites-available/api.domain.com
# Ganti server_name api.example.com -> api.domain.com
```

### 3. Copy Konfigurasi Dashboard

Buat file config untuk dashboard statis:

```bash
sudo nano /etc/nginx/sites-available/admin.domain.com
```

```
server {
    listen 80;
    server_name admin.domain.com;

    root /var/www/almuhtada/dashboard-news-ts/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 4. Enable Sites

```bash
sudo ln -s /etc/nginx/sites-available/api.domain.com /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/admin.domain.com /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL dengan Let's Encrypt

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.domain.com -d admin.domain.com
sudo certbot renew --dry-run
```

### 6. Konfigurasi Nginx Final (Setelah SSL)

Setelah certbot selesai, file config akan di-update otomatis dengan SSL. Jika perlu, sesuaikan config backend dengan menambahkan proxy headers:

```bash
sudo nano /etc/nginx/sites-available/api.domain.com
```

Pastikan ada:
```nginx
location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location /uploads/ {
    alias /var/www/almuhtada/backend-news-js/uploads/;
    expires 30d;
    add_header Cache-Control "public, immutable";
}
```

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Deploy Dashboard

### 1. Clone Dashboard

```bash
cd /var/www/almuhtada
git clone <repo-dashboard-url> dashboard-news-ts
cd dashboard-news-ts
```

### 2. Setup Environment

```bash
echo "VITE_API_URL=https://api.domain.com/api" > .env
```

### 3. Build

```bash
npm ci
npm run build
sudo systemctl reload nginx
```

### 4. Verifikasi

Buka `https://admin.domain.com` di browser.

---

## Firewall dan Izin File

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable

sudo chmod 600 /var/www/almuhtada/backend-news-js/.env
sudo chown -R deploy:deploy /var/www/almuhtada
```

Tidak perlu membuka port `3001` atau `3306` di UFW.

Verifikasi:
```bash
sudo ufw status verbose
# Status: active
# OpenSSH                   ALLOW       Anywhere
# Nginx Full                ALLOW       Anywhere
```

---

## Menjaga Server Tetap Hidup

PM2 sudah di-setup dengan `pm2 startup` dan `pm2 save`. Untuk verifikasi:

```bash
pm2 status
pm2 startup
# Jika belum, ulangi: pm2 startup && pm2 save
```

Untuk melihat log:
```bash
pm2 logs almuhtada-api        # realtime
pm2 logs almuhtada-api --lines 100  # 100 baris terakhir
pm2 monit                     # dashboard monitoring
```

Log rotasi agar disk tidak penuh:
```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

---

## Backup dan Monitoring

### Backup Database

Buat script backup manual:
```bash
#!/bin/bash
# /var/www/almuhtada/backend-news-js/scripts/backup-manual.sh
BACKUP_DIR="/var/www/almuhtada/backend-news-js/backups"
DB_NAME="almuhtada_prod"
DB_USER="almuhtada"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mysqldump -u $DB_USER -p $DB_NAME | gzip > $BACKUP_DIR/db_$TIMESTAMP.sql.gz
# Hapus backup lebih dari 14 hari
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +14 -delete
```

Cron job (setiap hari jam 2 pagi):
```bash
crontab -e
0 2 * * * /var/www/almuhtada/backend-news-js/scripts/backup-manual.sh >> /var/www/almuhtada/backend-news-js/logs/backup.log 2>&1
```

Atau gunakan script yang sudah tersedia:
```bash
bash /var/www/almuhtada/backend-news-js/scripts/deployment/backup.sh
```

### Backup Uploads

```bash
crontab -e
30 2 * * * tar -czf /var/www/almuhtada/backups/uploads_$(date +\%Y\%m\%d).tar.gz -C /var/www/almuhtada/backend-news-js uploads/
```

### Monitoring

```bash
# Cek resource
pm2 status
pm2 monit
df -h
free -h
htop

# Cek log error
tail -f /var/www/almuhtada/backend-news-js/logs/pm2-error.log
tail -f /var/log/nginx/error.log
```

Pasang notifikasi jika disk di atas 80% atau API tidak merespons (gunakan monitoring seperti UptimeRobot, Grafana, atau script custom).

---

## Update Aman

Sebelum update aplikasi atau migrasi database, **buat backup database dan uploads** terlebih dahulu.

```bash
cd /var/www/almuhtada/backend-news-js
git pull
npm ci --omit=dev
pm2 reload almuhtada-api --update-env

cd /var/www/almuhtada/dashboard-news-ts
git pull
npm ci
npm run build
sudo systemctl reload nginx
```

Jika ada migrasi database, jalankan setelah backup:
```bash
# Contoh: npm run migrate
# Jangan jalankan sequelize.sync({ alter: true }) tanpa backup!
```

---

## Update Sistem Tanpa Mengagetkan Server

Aktifkan pembaruan keamanan otomatis, tetapi jangan mengizinkan reboot otomatis tanpa jadwal maintenance:

```bash
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

Di menu:
- Pilih "Yes" untuk download dan install update keamanan otomatis
- Pilih "No" untuk auto-reboot (agar tidak reboot tiba-tiba)

Lakukan upgrade mayor Ubuntu, Node.js, atau MySQL hanya pada **maintenance window** setelah backup tersedia dan sudah dinotifikasikan ke tim.

---

## Checklist Sebelum Go-Live

- [ ] HTTPS aktif pada dashboard dan API (certbot success).
- [ ] CORS (`CORS_ORIGINS`) hanya berisi domain dashboard yang sah.
- [ ] `.env` tidak ada di Git dan mode filenya `600`.
- [ ] Port 3001 dan 3306 tidak publik (tidak ada di UFW).
- [ ] PM2 sudah `save` dan startup sudah aktif (`pm2 startup`).
- [ ] Backup database + uploads berhasil dan pernah diuji restore.
- [ ] Disk, RAM, dan error log dipantau (ada notifikasi jika >80%).
- [ ] Password database dan JWT secret dibuat unik untuk production (bukan pakai contoh).
- [ ] Log PM2 sudah dirotasi (`pm2 install pm2-logrotate`).
- [ ] Firewall aktif: `sudo ufw status` menunjukkan `active`.
- [ ] Semua endpoint API berfungsi: `curl https://api.domain.com/health`.
- [ ] Dashboard bisa diakses: `https://admin.domain.com`.
- [ ] Swagger UI bisa diakses: `https://api.domain.com/api-docs`.
- [ ] Upload gambar bisa diakses: `https://api.domain.com/uploads/...`.
