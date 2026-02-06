# 🖥️ Setup Guide - Sudah Login di VPS

Panduan untuk setup jika Anda **sudah login di VPS** (bukan dari local machine).

---

## ⚠️ Perbedaan Deploy Method

### Dari Local Machine → VPS:
```bash
# Di komputer local Anda
bash deploy-vps.sh  # ← Upload & setup remote VPS
```

### Sudah Login di VPS:
```bash
# Sudah di VPS (root@server)
bash setup-direct.sh  # ← Setup langsung di VPS ini
```

---

## 🚀 Quick Setup (Sudah di VPS)

### Option 1: Gunakan Setup Script

```bash
# 1. Upload setup-direct.sh ke VPS
# (dari local machine)
scp setup-direct.sh root@your-vps-ip:/root/

# 2. SSH ke VPS (atau sudah login)
ssh root@your-vps-ip

# 3. Jalankan setup
cd /root
chmod +x setup-direct.sh
bash setup-direct.sh
```

Script akan install:
- ✅ Docker & Docker Compose
- ✅ Firewall configuration
- ✅ SELinux handling (AlmaLinux)
- ✅ Create directories

---

### Option 2: Manual Step-by-Step

Jika Anda lebih suka manual:

#### 1. Update System

**Ubuntu/Debian:**
```bash
apt-get update
apt-get upgrade -y
apt-get install -y curl wget git
```

**AlmaLinux/RHEL:**
```bash
dnf update -y
dnf install -y curl wget git
```

#### 2. Install Docker

```bash
# Universal installer (works on all OS)
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl enable --now docker

# Verify
docker --version
```

#### 3. Install Docker Compose

```bash
# Get latest version
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)

# Download
curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Make executable
chmod +x /usr/local/bin/docker-compose

# Verify
docker-compose --version
```

#### 4. Setup Firewall

**Ubuntu:**
```bash
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 3001/tcp  # Backend API
ufw reload
```

**AlmaLinux:**
```bash
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=3001/tcp
firewall-cmd --reload
```

#### 5. Handle SELinux (AlmaLinux only)

```bash
# Check status
getenforce

# Set permissive (for testing)
setenforce 0
sed -i 's/^SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
```

#### 6. Create Directories

```bash
mkdir -p /var/www/news-backend/{uploads,backups,logs}
chmod -R 755 /var/www/news-backend
```

---

## 📁 Upload Project Files

### Dari Local Machine ke VPS:

```bash
# Di local machine
cd /Users/mm/Desktop/news/backend-news-express

# Upload ke VPS
rsync -avz --exclude 'node_modules' \
           --exclude '.git' \
           --exclude 'uploads/*' \
           --exclude 'logs/*' \
           --exclude 'backups/*' \
           -e ssh \
           ./ root@your-vps-ip:/var/www/news-backend/
```

### Atau Clone dari Git:

```bash
# Di VPS
cd /var/www
git clone <your-repo-url> news-backend
cd news-backend
```

---

## ⚙️ Configure Environment

### 1. Create .env File

```bash
cd /var/www/news-backend
nano .env
```

### 2. Isi dengan konfigurasi production:

```env
# Database (Auto-created by Docker)
DB_HOST=mysql
DB_USER=newsuser
DB_PASSWORD=Str0ng_P@ssw0rd_2024!
DB_NAME=news_production
DB_PORT=3306

# Application
NODE_ENV=production
PORT=3001

# JWT Secret (generate: openssl rand -base64 32)
JWT_SECRET=xK9mP2vR8nL5qW3tY7uB1cD4eF6gH0jI2kM5nO8pQ1rS

# API Keys
GROQ_API_KEY=gsk_your_actual_groq_api_key
TELEGRAM_BOT_TOKEN=1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
TELEGRAM_CHAT_ID=-1001234567890
TELEGRAM_TOPIC_PENULIS=3
TELEGRAM_TOPIC_EDITOR=2

# Backend URL
BACKEND_URL=https://your-domain.com
```

**Generate JWT Secret:**
```bash
openssl rand -base64 32
```

---

## 🚀 Start Application

```bash
cd /var/www/news-backend

# Start containers
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**Expected output:**
```
NAME           STATUS          PORTS
news-backend   Up 30 seconds   0.0.0.0:3001->3001/tcp
news-mysql     Up 30 seconds   0.0.0.0:3306->3306/tcp
```

---

## ✅ Verify Installation

### 1. Check Health Endpoint

```bash
curl http://localhost:3001/health
```

**Expected:**
```json
{"status":"ok","timestamp":"2024-01-30T12:00:00.000Z"}
```

### 2. Check Database

```bash
# Enter MySQL container
docker exec -it news-mysql mysql -u newsuser -p

# Enter password (from .env)
# Then run:
SHOW DATABASES;
USE news_production;
SHOW TABLES;
```

### 3. Check from External

```bash
# From local machine
curl http://your-vps-ip:3001/health
```

---

## 🔧 Common Commands

```bash
# View logs
docker-compose logs -f
docker-compose logs backend --tail=100

# Restart
docker-compose restart
docker-compose restart backend

# Stop
docker-compose down

# Start
docker-compose up -d

# Rebuild
docker-compose down
docker-compose up -d --build

# Backup database
bash backup.sh

# Restore database
bash restore.sh latest
```

---

## 🔍 Troubleshooting

### Docker not found

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker
```

### docker-compose not found

```bash
# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### Permission denied

```bash
chmod -R 755 /var/www/news-backend
```

### Port already in use

```bash
# Find what's using port
lsof -i :3001

# Kill process
kill -9 <PID>
```

### SELinux blocking (AlmaLinux)

```bash
# Temporary disable
setenforce 0

# Permanent
nano /etc/selinux/config
# Set: SELINUX=permissive
```

---

## 📊 Quick Reference

| Task | Command |
|------|---------|
| Start | `docker-compose up -d` |
| Stop | `docker-compose down` |
| Logs | `docker-compose logs -f` |
| Status | `docker-compose ps` |
| Restart | `docker-compose restart` |
| Backup DB | `bash backup.sh` |
| Restore DB | `bash restore.sh latest` |

---

## 🎯 Summary

Jika Anda **sudah di VPS**:

1. ✅ Jalankan `bash setup-direct.sh` (auto-install Docker, dll)
2. ✅ Upload project files ke `/var/www/news-backend`
3. ✅ Create `.env` file
4. ✅ Run `docker-compose up -d`
5. ✅ Done! 🎉

**Tidak perlu `deploy-vps.sh`** karena itu untuk deploy **dari local ke remote**!
