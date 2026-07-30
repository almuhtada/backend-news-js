# Quick Setup VPS - Sudah Login di Server

Panduan super cepat untuk setup jika Anda **sudah di VPS**.

---

## Situasi Anda Sekarang

Anda sudah login di VPS dengan direktori: **`backend-news-js`**

Prompt Anda: `[root@server backend-news-js]#`

---

## Quick Steps

### Langkah 1: Install Docker & Docker Compose

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

docker --version
docker-compose --version
```

### Langkah 2: Setup Firewall

```bash
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw reload
```

**Jika AlmaLinux:**
```bash
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=3001/tcp
firewall-cmd --reload
```

### Langkah 3: Create Directories

```bash
mkdir -p uploads backups logs
chmod -R 755 .
```

### Langkah 4: Configure .env

```bash
cp .env.example .env
nano .env
```

**Isi minimal yang HARUS diubah:**
```env
DB_HOST=127.0.0.1
DB_USER=newsuser
DB_PASSWORD=GantiDenganPasswordKuat123!
DB_NAME=news_production
NODE_ENV=production
PORT=3001
JWT_SECRET=$(openssl rand -base64 32)
BACKEND_URL=http://your-server-ip:3001
CORS_ORIGINS=https://admin.domain.com
```

### Langkah 5: Start Aplikasi

```bash
# Dengan Docker
docker-compose up -d
docker-compose ps
docker-compose logs -f
```

**Expected Output:**
```
NAME                    STATUS          PORTS
news-backend            Up 10 seconds   0.0.0.0:3001->3001/tcp
news-mysql              Up 10 seconds   0.0.0.0:3306->3306/tcp
```

Atau dengan PM2:
```bash
npm ci --omit=dev
pm2 startOrReload ecosystem.config.js --env production
pm2 save
pm2 startup
```

### Langkah 6: Verify

```bash
curl http://localhost:3001/health
# {"success":true,"status":"healthy","timestamp":"..."}
```

---

## One-Liner Installation

Install Docker:
```bash
curl -fsSL https://get.docker.com | sh && systemctl enable --now docker && \
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && \
chmod +x /usr/local/bin/docker-compose && echo "Docker ready"
```

Setup firewall Ubuntu:
```bash
ufw --force enable && ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw reload
```

---

## Checklist

- [ ] `docker --version` berjalan
- [ ] File `.env` sudah dibuat dan diisi
- [ ] `docker-compose ps` menunjukkan 2 containers UP
- [ ] `curl http://localhost:3001/health` return `{"success":true,"status":"healthy"}`
- [ ] Database sudah dibuat

---

## Quick Commands

```bash
docker-compose logs -f
docker-compose restart
docker-compose down
docker-compose up -d
docker-compose ps
pm2 status
pm2 logs almuhtada-api
bash scripts/deployment/backup.sh
bash scripts/deployment/restore.sh latest
```

---

## Done!

Aplikasi Anda sekarang running di:
- **Local:** http://localhost:3001
- **External:** http://your-server-ip:3001

Test dengan:
```bash
curl http://your-server-ip:3001/health
```

Jika perlu domain & SSL, setup Nginx:
```bash
sudo apt install nginx -y
sudo cp config/nginx/nginx-api.conf /etc/nginx/sites-available/almuhtada-api
sudo ln -s /etc/nginx/sites-available/almuhtada-api /etc/nginx/sites-enabled/
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d api.domain.com
```
