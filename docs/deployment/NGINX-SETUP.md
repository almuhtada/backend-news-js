# Nginx Setup Guide untuk Backend News API

Panduan lengkap untuk setup Nginx sebagai reverse proxy untuk Express backend API.

---

## 📋 Prerequisites

- VPS dengan Ubuntu/AlmaLinux/Debian
- Root atau sudo access
- Domain sudah pointing ke IP server (api.almuhtada.org)
- Backend Express sudah berjalan di port 3001

---

## 🚀 Instalasi Nginx

### Ubuntu/Debian

```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### AlmaLinux/CentOS/RHEL

```bash
sudo dnf install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Verifikasi Instalasi

```bash
sudo nginx -v
sudo systemctl status nginx
```

---

## ⚙️ Konfigurasi Nginx

### 1. Copy file konfigurasi

```bash
# Copy file konfigurasi ke sites-available
sudo cp nginx-api.conf /etc/nginx/sites-available/news-api

# Buat symbolic link ke sites-enabled
sudo ln -s /etc/nginx/sites-available/news-api /etc/nginx/sites-enabled/

# Hapus default config (optional)
sudo rm /etc/nginx/sites-enabled/default
```

### 2. Update path di konfigurasi

Edit file `/etc/nginx/sites-available/news-api`:

```bash
sudo nano /etc/nginx/sites-available/news-api
```

Update bagian berikut sesuai setup Anda:

```nginx
# Line 28-30: Update path uploads
location /uploads/ {
    alias /home/news/backend-news-express/uploads/;
    # Ganti dengan path sebenarnya di server Anda
}

# Line 15: Update root path
root /home/news/backend-news-express;
```

### 3. Test konfigurasi Nginx

```bash
# Test syntax nginx config
sudo nginx -t

# Jika OK, reload nginx
sudo systemctl reload nginx
```

---

## 🔒 Setup SSL Certificate (HTTPS)

### Menggunakan Let's Encrypt (Certbot)

#### 1. Install Certbot

**Ubuntu/Debian:**
```bash
sudo apt install certbot python3-certbot-nginx -y
```

**AlmaLinux/RHEL:**
```bash
sudo dnf install certbot python3-certbot-nginx -y
```

#### 2. Dapatkan SSL Certificate

```bash
sudo certbot --nginx -d api.almuhtada.org
```

Ikuti instruksi:
- Masukkan email Anda
- Agree to Terms of Service (Y)
- Pilih redirect HTTP ke HTTPS (pilih 2)

#### 3. Auto-renewal

Certbot otomatis setup cronjob untuk renewal. Test dengan:

```bash
sudo certbot renew --dry-run
```

#### 4. Uncomment SSL lines di config

Edit `/etc/nginx/sites-available/news-api`, uncomment baris SSL:

```nginx
# Sebelum (commented):
# ssl_certificate /etc/letsencrypt/live/api.almuhtada.org/fullchain.pem;

# Sesudah (uncommented):
ssl_certificate /etc/letsencrypt/live/api.almuhtada.org/fullchain.pem;
ssl_certificate_key /etc/letsencrypt/live/api.almuhtada.org/privkey.pem;
ssl_trusted_certificate /etc/letsencrypt/live/api.almuhtada.org/chain.pem;
```

Reload nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🎯 Setup Backend di PM2

Pastikan backend Express berjalan dengan PM2:

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start backend dengan PM2
cd /home/news/backend-news-express
pm2 start ecosystem.config.js

# Save PM2 process list
pm2 save

# Setup PM2 startup script
pm2 startup
# Jalankan command yang muncul (biasanya diawali dengan 'sudo')
```

---

## 🧪 Testing

### 1. Test HTTP → HTTPS Redirect

```bash
curl -I http://api.almuhtada.org
# Harus return 301 redirect ke https://
```

### 2. Test API Endpoints

```bash
# Test health check
curl https://api.almuhtada.org/health

# Test API endpoints
curl https://api.almuhtada.org/api/posts

# Test dengan verbose
curl -v https://api.almuhtada.org/api/categories
```

### 3. Test Upload Access

```bash
# Test akses file upload
curl -I https://api.almuhtada.org/uploads/test-image.jpg
```

### 4. Test dari Browser

Buka di browser:
- https://api.almuhtada.org
- https://api.almuhtada.org/api/posts
- https://api.almuhtada.org/api-docs (Swagger UI)

---

## 🔧 Troubleshooting

### 1. Nginx tidak start

```bash
# Check error logs
sudo tail -f /var/log/nginx/error.log

# Check config syntax
sudo nginx -t

# Check if port 80/443 already in use
sudo netstat -tlnp | grep :80
sudo netstat -tlnp | grep :443
```

### 2. 502 Bad Gateway

**Penyebab:** Backend Express tidak berjalan

```bash
# Check backend status
pm2 status
pm2 logs

# Restart backend
pm2 restart all

# Check if port 3001 listening
sudo netstat -tlnp | grep :3001
```

### 3. 403 Forbidden untuk /uploads

**Penyebab:** Permission issue

```bash
# Fix permissions
sudo chown -R nginx:nginx /home/news/backend-news-express/uploads
sudo chmod -R 755 /home/news/backend-news-express/uploads

# Untuk Ubuntu (nginx user = www-data)
sudo chown -R www-data:www-data /home/news/backend-news-express/uploads
```

### 4. SSL Certificate Error

```bash
# Check certificate
sudo certbot certificates

# Renew manually
sudo certbot renew

# Check nginx SSL config
sudo nginx -t
```

### 5. CORS Errors

Edit `/etc/nginx/sites-available/news-api`, update CORS headers:

```nginx
# Untuk specific domain (lebih aman)
add_header Access-Control-Allow-Origin "https://almuhtada.org" always;

# Untuk multiple domains
set $cors_origin "";
if ($http_origin ~* (https://almuhtada\.org|https://www\.almuhtada\.org)) {
    set $cors_origin $http_origin;
}
add_header Access-Control-Allow-Origin $cors_origin always;
```

---

## 📊 Monitoring & Logs

### Nginx Logs

```bash
# Access log
sudo tail -f /var/log/nginx/news-api-access.log

# Error log
sudo tail -f /var/log/nginx/news-api-error.log

# All nginx logs
sudo tail -f /var/log/nginx/*.log
```

### Backend Logs

```bash
# PM2 logs
pm2 logs

# PM2 monit
pm2 monit
```

### System Status

```bash
# Nginx status
sudo systemctl status nginx

# Check listening ports
sudo netstat -tlnp

# Check processes
ps aux | grep nginx
ps aux | grep node
```

---

## 🔐 Keamanan Tambahan

### 1. Firewall (UFW - Ubuntu)

```bash
# Enable firewall
sudo ufw enable

# Allow SSH
sudo ufw allow ssh

# Allow HTTP & HTTPS
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

### 2. Fail2Ban (optional)

Proteksi terhadap brute force:

```bash
sudo apt install fail2ban -y
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 3. Rate Limiting di Nginx

Edit `/etc/nginx/sites-available/news-api`, tambahkan di dalam `http {}` block:

```nginx
# Di atas server block
limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;

# Di dalam location /api/
location /api/ {
    limit_req zone=api_limit burst=20 nodelay;
    # ... proxy settings
}
```

### 4. Hide Nginx Version

Edit `/etc/nginx/nginx.conf`:

```nginx
http {
    server_tokens off;
    # ...
}
```

---

## 🔄 Maintenance

### Update Nginx

```bash
# Ubuntu/Debian
sudo apt update
sudo apt upgrade nginx -y

# AlmaLinux/RHEL
sudo dnf upgrade nginx -y
```

### Reload vs Restart

```bash
# Reload (no downtime)
sudo systemctl reload nginx

# Restart (ada downtime)
sudo systemctl restart nginx
```

### Backup Config

```bash
# Backup konfigurasi
sudo cp /etc/nginx/sites-available/news-api \
     /etc/nginx/sites-available/news-api.backup.$(date +%Y%m%d)

# Backup semua config
sudo tar -czf nginx-backup-$(date +%Y%m%d).tar.gz /etc/nginx/
```

---

## ✅ Checklist Final

- [ ] Nginx terinstall dan running
- [ ] File konfigurasi di `/etc/nginx/sites-available/news-api`
- [ ] Symbolic link ke `/etc/nginx/sites-enabled/`
- [ ] Path uploads sudah benar
- [ ] SSL certificate terinstall (certbot)
- [ ] Backend Express running di PM2
- [ ] Test HTTP → HTTPS redirect berhasil
- [ ] Test API endpoints berhasil
- [ ] Test akses /uploads berhasil
- [ ] Firewall dikonfigurasi
- [ ] Logs accessible dan readable
- [ ] Auto-renewal SSL setup (certbot)

---

## 📚 Referensi

- [Nginx Official Docs](https://nginx.org/en/docs/)
- [PM2 Documentation](https://pm2.keymetrics.io/docs/)
- [Let's Encrypt Certbot](https://certbot.eff.org/)
- [Nginx Reverse Proxy Guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

---

## 🆘 Support

Jika menemui masalah:

1. Check logs: nginx error log dan PM2 logs
2. Verify config: `sudo nginx -t`
3. Check process: `pm2 status` dan `sudo systemctl status nginx`
4. Test endpoint: `curl -v https://api.almuhtada.org/api/posts`

Untuk debugging lebih lanjut, share:
- Output dari `sudo nginx -t`
- Nginx error log
- PM2 logs
- Browser console errors (jika ada)
