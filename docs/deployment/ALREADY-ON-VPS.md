# Setup Guide - Sudah Login di VPS

Panduan untuk setup jika Anda **sudah login di VPS** (bukan dari local machine).

---

## Perbedaan Deploy Method

### Dari Local Machine -> VPS:
```bash
# Di komputer local Anda
rsync -avz --exclude 'node_modules' --exclude '.git' \
   -e ssh ./ deploy@vps:/var/www/almuhtada/backend-news-js/
```

### Sudah Login di VPS:
```bash
# Sudah di VPS - langsung setup
```

---

## Quick Setup (Sudah di VPS)

### Option 1: Gunakan Setup Script

Script tersedia di `scripts/deployment/setup-direct.sh`:

```bash
cd /var/www/almuhtada/backend-news-js
chmod +x scripts/deployment/setup-direct.sh
sudo bash scripts/deployment/setup-direct.sh
```

Script akan install:
- Docker & Docker Compose
- Firewall configuration
- Create directories

### Option 2: Manual Step-by-Step

#### 1. Update System

**Ubuntu/Debian:**
```bash
apt-get update && apt-get upgrade -y
apt-get install -y curl wget git
```

#### 2. Install Docker

```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable --now docker
docker --version
```

#### 3. Install Docker Compose

```bash
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

#### 4. Setup Firewall

**Ubuntu:**
```bash
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw reload
```

**AlmaLinux:**
```bash
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=ssh --add-service=http --add-service=https
firewall-cmd --permanent --add-port=3001/tcp
firewall-cmd --reload
```

#### 5. Create Directories

```bash
mkdir -p uploads backups logs
chmod -R 755 .
```

---

## Configure Environment

### 1. Create .env File

```bash
cp .env.example .env
nano .env
```

### 2. Isi dengan konfigurasi production:

```env
DB_HOST=127.0.0.1
DB_USER=newsuser
DB_PASSWORD=Str0ng_P@ssw0rd_2024!
DB_NAME=news_production
DB_PORT=3306
NODE_ENV=production
PORT=3001
JWT_SECRET=$(openssl rand -base64 32)
GROQ_API_KEY=gsk_your_actual_groq_api_key
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-1001234567890
TELEGRAM_TOPIC_PENULIS=3
TELEGRAM_TOPIC_EDITOR=2
BACKEND_URL=https://your-domain.com
CORS_ORIGINS=https://admin.your-domain.com
```

---

## Start Application

### Dengan Docker:
```bash
docker-compose up -d
docker-compose ps
docker-compose logs -f
```

### Dengan PM2:
```bash
npm ci --omit=dev
pm2 startOrReload ecosystem.config.js --env production
pm2 save
pm2 startup
```

---

## Verify Installation

### 1. Health Check

```bash
curl http://localhost:3001/health
# {"success":true,"status":"healthy","timestamp":"..."}
```

### 2. Check Database

```bash
docker exec -it news-mysql mysql -u newsuser -p
SHOW DATABASES;
USE news_production;
SHOW TABLES;
```

### 3. Check from External

```bash
curl http://your-vps-ip:3001/health
```

---

## Common Commands

```bash
docker-compose logs -f
docker-compose restart
docker-compose down
docker-compose up -d
docker-compose up -d --build
pm2 logs almuhtada-api
pm2 restart almuhtada-api
bash scripts/deployment/backup.sh
bash scripts/deployment/restore.sh latest
```

---

## Troubleshooting

### Docker not found
```bash
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

### Port already in use
```bash
lsof -i :3001
kill -9 <PID>
```

### PM2 not found
```bash
npm install -g pm2
```
