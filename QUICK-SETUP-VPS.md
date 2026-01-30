# ⚡ Quick Setup VPS - Sudah Login di Server

Panduan super cepat untuk setup jika Anda **sudah di VPS**.

---

## 🎯 Situasi Anda Sekarang

Anda sudah login di VPS dengan direktori: **`backend-news-js`**

Prompt Anda: `[root@server backend-news-js]#`

---

## 🚀 Quick Steps

### Langkah 1: Install Docker & Docker Compose

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Verify
docker --version
docker-compose --version
```

### Langkah 2: Setup Firewall

**Jika AlmaLinux:**
```bash
systemctl enable --now firewalld
firewall-cmd --permanent --add-service=ssh
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-service=https
firewall-cmd --permanent --add-port=3001/tcp
firewall-cmd --reload

# Disable SELinux (untuk testing)
setenforce 0
sed -i 's/^SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config
```

**Jika Ubuntu:**
```bash
ufw --force enable
ufw allow 22,80,443,3001/tcp
ufw reload
```

### Langkah 3: Create Directories

```bash
# Jika di /var/www/backend-news-js atau /root/backend-news-js
cd /root/backend-news-js  # atau sesuai lokasi Anda

# Create directories
mkdir -p uploads backups logs
chmod -R 755 .
```

### Langkah 4: Configure .env

```bash
# Copy example
cp .env.example .env

# Edit
nano .env
```

**Isi minimal yang HARUS diubah:**

```env
# Database (Auto-created by Docker - JANGAN UBAH DB_HOST!)
DB_HOST=mysql
DB_USER=newsuser
DB_PASSWORD=GantiDenganPasswordKuat123!
DB_NAME=news_production
DB_PORT=3306

# Application
NODE_ENV=production
PORT=3001

# JWT Secret - Generate dengan: openssl rand -base64 32
JWT_SECRET=PASTE_HASIL_GENERATE_DISINI

# API Keys (isi dengan yang benar)
GROQ_API_KEY=gsk_xxxxxxxx
TELEGRAM_BOT_TOKEN=xxxxxxxxxx
TELEGRAM_CHAT_ID=-xxxxxxxxxx

# Backend URL
BACKEND_URL=http://your-server-ip:3001
```

**Generate JWT Secret:**
```bash
openssl rand -base64 32
# Copy hasilnya dan paste ke JWT_SECRET
```

### Langkah 5: Start Application

```bash
# Start
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**Expected Output:**
```
NAME                    STATUS          PORTS
news-backend            Up 10 seconds   0.0.0.0:3001->3001/tcp
news-mysql              Up 10 seconds   0.0.0.0:3306->3306/tcp
```

### Langkah 6: Verify

```bash
# Check health
curl http://localhost:3001/health

# Expected:
# {"status":"ok","timestamp":"..."}

# Check database created
docker exec -it news-mysql mysql -u newsuser -p
# Enter password: GantiDenganPasswordKuat123!
# Then: SHOW DATABASES;
```

---

## ✅ One-Liner Installation (Copy-Paste)

Jika mau super cepat, copy semua ini dan paste di terminal:

```bash
# Install Docker & Compose
curl -fsSL https://get.docker.com | sh && \
systemctl enable --now docker && \
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose && \
chmod +x /usr/local/bin/docker-compose && \
echo "✅ Docker installed: $(docker --version)" && \
echo "✅ Docker Compose installed: $(docker-compose --version)"
```

Lalu setup firewall (pilih sesuai OS):

**AlmaLinux:**
```bash
systemctl enable --now firewalld && \
firewall-cmd --permanent --add-service=ssh && \
firewall-cmd --permanent --add-service=http && \
firewall-cmd --permanent --add-service=https && \
firewall-cmd --permanent --add-port=3001/tcp && \
firewall-cmd --reload && \
setenforce 0 && \
sed -i 's/^SELINUX=enforcing/SELINUX=permissive/' /etc/selinux/config && \
echo "✅ Firewall configured"
```

**Ubuntu:**
```bash
ufw --force enable && \
ufw allow 22,80,443,3001/tcp && \
ufw reload && \
echo "✅ Firewall configured"
```

---

## 📋 Checklist

Setup berhasil jika:

- [ ] ✅ `docker --version` berjalan
- [ ] ✅ `docker-compose --version` berjalan
- [ ] ✅ File `.env` sudah dibuat dan diisi
- [ ] ✅ `docker-compose ps` menunjukkan 2 containers UP
- [ ] ✅ `curl http://localhost:3001/health` return `{"status":"ok"}`
- [ ] ✅ Database `news_production` sudah dibuat (auto by Docker)

---

## 🔧 Common Issues

### Port 3001 sudah digunakan

```bash
# Check what's using it
lsof -i :3001

# Kill process
kill -9 <PID>
```

### Docker daemon not running

```bash
systemctl status docker
systemctl start docker
```

### Permission denied

```bash
chmod -R 755 /root/backend-news-js
```

### SELinux blocking (AlmaLinux)

```bash
setenforce 0
getenforce  # Should show: Permissive
```

---

## 📱 Quick Commands

```bash
# Logs
docker-compose logs -f

# Restart
docker-compose restart

# Stop
docker-compose down

# Start
docker-compose up -d

# Status
docker-compose ps

# Backup database
bash backup.sh

# Restore database
bash restore.sh latest
```

---

## 🎉 Done!

Aplikasi Anda sekarang running di:
- **Local:** http://localhost:3001
- **External:** http://your-server-ip:3001

Test dengan:
```bash
curl http://your-server-ip:3001/health
```

Jika perlu domain & SSL, baca [DOCKER-DEPLOYMENT.md](DOCKER-DEPLOYMENT.md) untuk setup Nginx & Let's Encrypt.

**Selamat! 🚀**
