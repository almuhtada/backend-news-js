# Nginx Setup Guide untuk Backend News API

Panduan lengkap untuk setup Nginx sebagai reverse proxy untuk Express backend API.

---

## Prerequisites

- VPS dengan Ubuntu/Debian
- Root atau sudo access
- Domain sudah pointing ke IP server (api.almuhtada.org)
- Backend Express sudah berjalan di port 3001

---

## Instalasi Nginx

```bash
sudo apt update
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### Verifikasi Instalasi

```bash
sudo nginx -v
sudo systemctl status nginx
```

---

## Konfigurasi Nginx

### 1. Copy file konfigurasi

File config tersedia di:
- `config/nginx/nginx-api.conf` - Konfigurasi lengkap dengan SSL, CORS, caching
- `deploy/ubuntu/almuhtada-api.nginx.conf` - Konfigurasi minimal untuk Ubuntu

```bash
# Pilih salah satu
sudo cp config/nginx/nginx-api.conf /etc/nginx/sites-available/almuhtada-api
# atau
sudo cp deploy/ubuntu/almuhtada-api.nginx.conf /etc/nginx/sites-available/almuhtada-api

# Buat symbolic link
sudo ln -s /etc/nginx/sites-available/almuhtada-api /etc/nginx/sites-enabled/

# Hapus default config (optional)
sudo rm /etc/nginx/sites-enabled/default
```

### 2. Update domain di konfigurasi

Edit file `/etc/nginx/sites-available/almuhtada-api`:

```bash
sudo nano /etc/nginx/sites-available/almuhtada-api
```

Update `server_name` dengan domain Anda:
```nginx
server_name api.almuhtada.org;
```

### 3. Test konfigurasi Nginx

```bash
sudo nginx -t
sudo systemctl reload nginx
```

---

## Setup SSL Certificate (HTTPS)

### Menggunakan Let's Encrypt (Certbot)

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.almuhtada.org
```

### Auto-renewal

Certbot otomatis setup cronjob untuk renewal. Test dengan:

```bash
sudo certbot renew --dry-run
```

---

## Setup Backend di PM2

Pastikan backend Express berjalan dengan PM2:

```bash
cd /var/www/almuhtada/backend-news-js
pm2 startOrReload ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## Testing

### 1. Test HTTP -> HTTPS Redirect

```bash
curl -I http://api.almuhtada.org
# Harus return 301 redirect ke https://
```

### 2. Test API Endpoints

```bash
curl https://api.almuhtada.org/health
curl https://api.almuhtada.org/api/posts
curl -v https://api.almuhtada.org/api/categories
```

### 3. Test Upload Access

```bash
curl -I https://api.almuhtada.org/uploads/test-image.jpg
```

### 4. Test dari Browser

- https://api.almuhtada.org
- https://api.almuhtada.org/api-docs (Swagger UI)

---

## Troubleshooting

### 1. Nginx tidak start

```bash
sudo tail -f /var/log/nginx/error.log
sudo nginx -t
sudo netstat -tlnp | grep :80
```

### 2. 502 Bad Gateway

Backend Express tidak berjalan:

```bash
pm2 status
pm2 logs
pm2 restart almuhtada-api
sudo netstat -tlnp | grep :3001
```

### 3. 403 Forbidden untuk /uploads

```bash
sudo chown -R www-data:www-data /var/www/almuhtada/backend-news-js/uploads
sudo chmod -R 755 /var/www/almuhtada/backend-news-js/uploads
```

### 4. SSL Certificate Error

```bash
sudo certbot certificates
sudo certbot renew
sudo nginx -t
```

---

## Monitoring & Logs

### Nginx Logs

```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Backend Logs

```bash
pm2 logs almuhtada-api
pm2 monit
```

---

## Maintenance

```bash
# Reload (no downtime)
sudo systemctl reload nginx

# Restart (ada downtime)
sudo systemctl restart nginx

# Backup config
sudo cp /etc/nginx/sites-available/almuhtada-api \
     /etc/nginx/sites-available/almuhtada-api.backup.$(date +%Y%m%d)
```
