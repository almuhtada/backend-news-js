# 🚀 Nginx Quick Start Guide

Setup nginx untuk API backend dalam 3 langkah mudah!

---

## 📦 File Yang Sudah Dibuat

✅ `nginx-api.conf` - Konfigurasi nginx reverse proxy
✅ `NGINX-SETUP.md` - Dokumentasi lengkap
✅ `setup-nginx.sh` - Script auto-setup
✅ `NGINX-QUICKSTART.md` - File ini (panduan cepat)

---

## ⚡ Setup Cepat (3 Langkah)

### 1️⃣ Upload files ke VPS

```bash
# Upload semua files ke server
scp -r backend-news-express root@api.almuhtada.org:/root/
```

### 2️⃣ Jalankan auto-setup script

```bash
# SSH ke server
ssh root@api.almuhtada.org

# Masuk ke folder
cd /root/backend-news-express

# Jalankan setup script
chmod +x setup-nginx.sh
sudo ./setup-nginx.sh
```

Script akan otomatis:
- ✅ Install Nginx
- ✅ Copy & configure nginx config
- ✅ Update paths otomatis
- ✅ Setup firewall
- ✅ Test & reload nginx

### 3️⃣ Setup SSL & start backend

```bash
# Install SSL certificate
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.almuhtada.org

# Start backend dengan PM2
npm install
pm2 start ecosystem.config.js
pm2 save
pm2 startup  # Jalankan command yang muncul
```

---

## ✅ Verifikasi

Cek apakah semuanya berjalan:

```bash
# 1. Check Nginx status
sudo systemctl status nginx

# 2. Check backend status
pm2 status

# 3. Test API endpoint
curl https://api.almuhtada.org/api/posts

# 4. Test di browser
# Buka: https://api.almuhtada.org/api-docs
```

---

## 🔧 Perintah Berguna

### Nginx

```bash
# Test config
sudo nginx -t

# Reload (tanpa downtime)
sudo systemctl reload nginx

# Restart nginx
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/news-api-error.log
sudo tail -f /var/log/nginx/news-api-access.log
```

### Backend PM2

```bash
# Status
pm2 status

# Logs
pm2 logs

# Restart
pm2 restart all

# Monitor
pm2 monit
```

### SSL Certificate

```bash
# Check certificate
sudo certbot certificates

# Renew manually
sudo certbot renew

# Test auto-renewal
sudo certbot renew --dry-run
```

---

## 🐛 Troubleshooting Cepat

### ❌ 502 Bad Gateway

**Problem:** Backend tidak running

```bash
# Solution:
pm2 status
pm2 restart all
sudo systemctl reload nginx
```

### ❌ 403 Forbidden (uploads)

**Problem:** Permission issue

```bash
# Solution:
sudo chown -R www-data:www-data uploads/
sudo chmod -R 755 uploads/
```

### ❌ SSL Error

**Problem:** Certificate tidak valid

```bash
# Solution:
sudo certbot renew
sudo systemctl reload nginx
```

### ❌ Cannot connect

**Problem:** Firewall blocking

```bash
# Solution:
sudo ufw allow 'Nginx Full'
sudo systemctl reload nginx
```

---

## 📊 Struktur Nginx Config

```
/etc/nginx/
├── sites-available/
│   └── news-api          # Config utama
├── sites-enabled/
│   └── news-api -> ../sites-available/news-api
└── nginx.conf            # Config global
```

---

## 🎯 Endpoint Yang Tersedia

Setelah setup selesai:

| Endpoint | URL | Keterangan |
|----------|-----|------------|
| API Docs | `https://api.almuhtada.org/api-docs` | Swagger UI |
| Posts | `https://api.almuhtada.org/api/posts` | List posts |
| Categories | `https://api.almuhtada.org/api/categories` | List categories |
| Uploads | `https://api.almuhtada.org/uploads/...` | Static files |
| Health | `https://api.almuhtada.org/health` | Health check |

---

## 📖 Dokumentasi Lengkap

Untuk konfigurasi advanced, lihat:

- **[NGINX-SETUP.md](NGINX-SETUP.md)** - Setup manual & troubleshooting lengkap
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guide lengkap
- **[nginx-api.conf](nginx-api.conf)** - File konfigurasi nginx

---

## 💡 Tips

1. **Selalu backup sebelum update:**
   ```bash
   sudo cp /etc/nginx/sites-available/news-api \
          /etc/nginx/sites-available/news-api.backup
   ```

2. **Monitor logs secara berkala:**
   ```bash
   pm2 logs
   sudo tail -f /var/log/nginx/*.log
   ```

3. **Setup monitoring (optional):**
   ```bash
   pm2 install pm2-logrotate
   pm2 set pm2-logrotate:max_size 10M
   ```

4. **Enable gzip compression** (sudah ada di config):
   - Menghemat bandwidth
   - Mempercepat loading

5. **Rate limiting** sudah dikonfigurasi:
   - 10 requests/second per IP
   - Burst up to 20

---

## 🆘 Butuh Bantuan?

1. ❓ Cek logs terlebih dahulu
2. 🔍 Baca [NGINX-SETUP.md](NGINX-SETUP.md) untuk troubleshooting detail
3. 📝 Test config: `sudo nginx -t`
4. 🔄 Restart services: `sudo systemctl restart nginx` & `pm2 restart all`

---

**Good luck! 🎉**
