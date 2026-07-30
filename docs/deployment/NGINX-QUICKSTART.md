# Nginx Quick Start Guide

Setup nginx untuk API backend dalam 3 langkah mudah!

---

## File Yang Sudah Dibuat

- `config/nginx/nginx-api.conf` - Konfigurasi nginx reverse proxy
- `deploy/ubuntu/almuhtada-api.nginx.conf` - Konfigurasi minimal Ubuntu
- `scripts/deployment/setup-nginx.sh` - Script auto-setup
- `NGINX-SETUP.md` - Dokumentasi lengkap

---

## Setup Cepat (3 Langkah)

### 1. Upload files ke VPS

```bash
rsync -avz --exclude node_modules -e ssh ./ deploy@vps:/var/www/almuhtada/backend-news-js/
```

### 2. Jalankan auto-setup script

```bash
ssh deploy@vps
cd /var/www/almuhtada/backend-news-js
sudo bash scripts/deployment/setup-nginx.sh
```

Script akan otomatis:
- Install Nginx
- Copy & configure nginx config
- Update paths otomatis
- Setup firewall
- Test & reload nginx

### 3. Setup SSL & start backend

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.almuhtada.org

# Start backend dengan PM2
npm ci --omit=dev
pm2 startOrReload ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## Verifikasi

```bash
sudo systemctl status nginx
pm2 status
curl https://api.almuhtada.org/api/posts
curl https://api.almuhtada.org/health
```

---

## Perintah Berguna

### Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
sudo systemctl restart nginx
sudo tail -f /var/log/nginx/error.log
```

### Backend PM2

```bash
pm2 status
pm2 logs almuhtada-api
pm2 restart almuhtada-api
pm2 monit
```

### SSL Certificate

```bash
sudo certbot certificates
sudo certbot renew
sudo certbot renew --dry-run
```

---

## Troubleshooting Cepat

### 502 Bad Gateway
```bash
pm2 restart almuhtada-api
sudo systemctl reload nginx
```

### 403 Forbidden (uploads)
```bash
sudo chown -R www-data:www-data uploads/
sudo chmod -R 755 uploads/
```

### SSL Error
```bash
sudo certbot renew
sudo systemctl reload nginx
```

### Cannot connect
```bash
sudo ufw allow 'Nginx Full'
sudo systemctl reload nginx
```

---

## Endpoint Yang Tersedia

| Endpoint | URL | Keterangan |
|----------|-----|------------|
| API Docs | `https://api.almuhtada.org/api-docs` | Swagger UI |
| Posts | `https://api.almuhtada.org/api/posts` | List posts |
| Categories | `https://api.almuhtada.org/api/categories` | List categories |
| Uploads | `https://api.almuhtada.org/uploads/...` | Static files |
| Health | `https://api.almuhtada.org/health` | Health check |

---

## Dokumentasi Lengkap

- **NGINX-SETUP.md** - Setup manual & troubleshooting lengkap
- **DEPLOYMENT.md** - Deployment guide lengkap
- **config/nginx/nginx-api.conf** - File konfigurasi nginx
